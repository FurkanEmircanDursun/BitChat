package com.bitchat.bridge

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import android.bluetooth.BluetoothManager
import android.os.BatteryManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.bitchat.specs.NativeBitChatSpec
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.*
import org.json.JSONArray
import org.json.JSONObject
import java.security.KeyFactory
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.MessageDigest
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.security.spec.X509EncodedKeySpec
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.ConcurrentHashMap
import java.io.File

class LocalDatabase(context: Context) : SQLiteOpenHelper(context, "bitchat.db", null, 1) {
  override fun onCreate(db: SQLiteDatabase) {
    db.execSQL("CREATE TABLE records (kind TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(kind,id))")
    db.execSQL("CREATE TABLE metadata (id INTEGER PRIMARY KEY CHECK(id=1), body TEXT NOT NULL)")
  }
  override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
    throw IllegalStateException("Unsupported database upgrade; data preserved")
  }
}

class BitChatModule(private val context: ReactApplicationContext) : NativeBitChatSpec(context) {
  private val database = LocalDatabase(context)
  private val executor = Executors.newSingleThreadExecutor()
  private val main = Handler(Looper.getMainLooper())
  private val client by lazy { Nearby.getConnectionsClient(context) }
  private var localName = "Komşu"
  @Volatile private var active = false
  private val connected = ConcurrentHashMap.newKeySet<String>()
  private val pending = ConcurrentHashMap.newKeySet<String>()
  private val requested = ConcurrentHashMap.newKeySet<String>()
  private val names = ConcurrentHashMap<String, String>()
  private val alias = "bitchat-identity-v1"
  private val serviceId = "com.bitchat.mesh.v1"
  override fun getName() = "BitChat"

  private fun event(type: String, fields: JSONObject = JSONObject()) {
    fields.put("type", type)
    if (context.hasActiveReactInstance()) emitOnRadioEvent(fields.toString())
  }
  private fun error(promise: Promise, e: Exception) {promise.reject("BITCHAT_ERROR", e.message ?: "İşlem tamamlanamadı", e)}
  private fun work(promise: Promise, block: () -> Any?) {
    executor.execute { try {promise.resolve(block())} catch(e: Exception) {error(promise, e)} }
  }
  private fun keyEntry(): KeyStore.PrivateKeyEntry {
    val store = KeyStore.getInstance("AndroidKeyStore").apply {load(null)}
    if (!store.containsAlias(alias)) {
      KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, "AndroidKeyStore").apply {
        initialize(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY)
          .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
          .setDigests(KeyProperties.DIGEST_SHA256).build())
      }.generateKeyPair()
    }
    return store.getEntry(alias, null) as KeyStore.PrivateKeyEntry
  }
  private fun encode(bytes: ByteArray) = Base64.encodeToString(bytes, Base64.NO_WRAP)
  private fun fingerprint(bytes: ByteArray) = MessageDigest.getInstance("SHA-256").digest(bytes).take(12).joinToString("") {"%02x".format(it)}
  override fun getIdentity(promise: Promise) = work(promise) {
    val key = keyEntry().certificate.publicKey.encoded
    JSONObject().put("publicKey", encode(key)).put("sender", fingerprint(key)).toString()
  }
  override fun createId(promise: Promise) {promise.resolve(UUID.randomUUID().toString())}
  override fun exportData(json:String, promise:Promise) {
    executor.execute {
      try {
        require(json.length <= 12_000_000) {"Dışa aktarım sınırı aşıldı"}
        val directory=File(context.cacheDir,"exports").apply {mkdirs()}
        val file=File(directory,"BitChat-${System.currentTimeMillis()}.json")
        file.writeText(json,Charsets.UTF_8)
        val uri=FileProvider.getUriForFile(context,"${context.packageName}.files",file)
        main.post {
          try {
            val activity=context.currentActivity ?: throw IllegalStateException("Uygulamayı öne getirip yeniden deneyin")
            val intent=Intent(Intent.ACTION_SEND).setType("application/json").putExtra(Intent.EXTRA_STREAM,uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            activity.startActivity(Intent.createChooser(intent,"BitChat kaydını paylaş"))
            promise.resolve(null)
          } catch(e:Exception) {error(promise,e)}
        }
      } catch(e:Exception) {error(promise,e)}
    }
  }
  override fun sign(data: String, promise: Promise) = work(promise) {
    require(data.length <= 16000)
    val signature = Signature.getInstance("SHA256withECDSA")
    signature.initSign(keyEntry().privateKey); signature.update(data.toByteArray(Charsets.UTF_8)); encode(signature.sign())
  }
  override fun verify(data: String, signature: String, publicKey: String, sender: String, promise: Promise) = work(promise) {
    try {
      require(data.length <= 16000 && signature.length <= 200 && publicKey.length <= 256)
      val bytes = Base64.decode(publicKey, Base64.NO_WRAP)
      if (fingerprint(bytes) != sender) false else {
        val key = KeyFactory.getInstance("EC").generatePublic(X509EncodedKeySpec(bytes))
        Signature.getInstance("SHA256withECDSA").run {initVerify(key); update(data.toByteArray(Charsets.UTF_8)); verify(Base64.decode(signature, Base64.NO_WRAP))}
      }
    } catch (_: Exception) {false}
  }

  override fun loadState(promise: Promise) = work(promise) {
    val db = database.readableDatabase
    var metadata: JSONObject? = null
    db.rawQuery("SELECT body FROM metadata WHERE id=1", null).use {if(it.moveToFirst()) metadata = JSONObject(it.getString(0))}
    if (metadata == null) "" else {
      val result = metadata!!
      for (kind in listOf("messages", "listings", "points")) {
        val rows = JSONArray()
        db.rawQuery("SELECT body FROM records WHERE kind=? ORDER BY rowid", arrayOf(kind)).use {
          while(it.moveToNext()) rows.put(JSONObject(it.getString(0)))
        }
        result.put(kind, rows)
      }
      result.toString()
    }
  }
  override fun saveState(json: String, promise: Promise) = work(promise) {
    require(json.length <= 12_000_000) {"Yerel kayıt sınırı aşıldı"}
    val input = JSONObject(json)
    require(input.getInt("schema") == 1)
    val db = database.writableDatabase
    db.beginTransaction()
    try {
      for (kind in listOf("messages", "listings", "points")) {
        val rows = input.getJSONArray(kind)
        require(rows.length() <= 10000)
        val ids = mutableSetOf<String>()
        val stmt = db.compileStatement("INSERT OR REPLACE INTO records(kind,id,body) VALUES(?,?,?)")
        try {
          for (i in 0 until rows.length()) {
            val row = rows.getJSONObject(i)
            val id = if (kind == "messages") row.getJSONObject("message").getString("id") else row.getString("id")
            require(ids.add(id)) {"Yinelenen yerel kayıt"}
            stmt.bindString(1, kind); stmt.bindString(2, id); stmt.bindString(3, row.toString()); stmt.executeInsert(); stmt.clearBindings()
          }
        } finally {stmt.close()}
        val deleted = mutableListOf<String>()
        db.rawQuery("SELECT id FROM records WHERE kind=?", arrayOf(kind)).use {while(it.moveToNext()) {val id=it.getString(0); if(!ids.contains(id)) deleted.add(id)}}
        for (id in deleted) db.delete("records", "kind=? AND id=?", arrayOf(kind,id))
        input.remove(kind)
      }
      val stmt = db.compileStatement("INSERT OR REPLACE INTO metadata(id,body) VALUES(1,?)")
      try {stmt.bindString(1, input.toString()); stmt.executeInsert()} finally {stmt.close()}
      db.setTransactionSuccessful()
    } finally {db.endTransaction()}
    null
  }

  override fun getDeviceStatus(promise: Promise) {
    try {
      val battery = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
      val level = battery?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
      val scale = battery?.getIntExtra(BatteryManager.EXTRA_SCALE, 100) ?: 100
      val plugged = battery?.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0) ?: 0
      val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
      val cap = cm.getNetworkCapabilities(cm.activeNetwork)
      val adapter = (context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager).adapter
      val bluetooth = try {adapter?.isEnabled == true} catch(_:SecurityException) {false}
      val wifi = (context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager).isWifiEnabled
      promise.resolve(JSONObject().put("battery", if(level < 0 || scale <= 0) -1 else level*100/scale)
        .put("charging", plugged != 0).put("internet", cap?.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) == true)
        .put("bluetooth",bluetooth).put("wifi",wifi).put("playServices",GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(context) == 0).toString())
    } catch(e:Exception) {error(promise,e)}
  }
  override fun getLocation(promise: Promise) {
    if(ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
       ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
      promise.reject("LOCATION_PERMISSION", "Konum izni verilmedi"); return
    }
    main.post {
      val manager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
      var finished = false
      lateinit var listener: LocationListener
      val timeout = Runnable {if(!finished) {finished=true; manager.removeUpdates(listener); promise.reject("LOCATION_TIMEOUT", "Konum alınamadı. Açık alanda yeniden deneyin veya koordinat girin.")}}
      listener = object: LocationListener {
        override fun onLocationChanged(location: Location) {
          if(finished) return
          if(location.accuracy > 1000 || System.currentTimeMillis()-location.time > 120000) return
          finished=true; manager.removeUpdates(this); main.removeCallbacks(timeout)
          promise.resolve(JSONObject().put("latitude",location.latitude).put("longitude",location.longitude).put("accuracy",location.accuracy).toString())
        }
        override fun onProviderEnabled(provider:String) {}
        override fun onProviderDisabled(provider:String) {}
        @Deprecated("Deprecated in Android") override fun onStatusChanged(provider:String?,status:Int,extras:Bundle?) {}
      }
      try {
        val providers=listOf(LocationManager.GPS_PROVIDER,LocationManager.NETWORK_PROVIDER).filter {manager.isProviderEnabled(it)}
        if(providers.isEmpty()) {promise.reject("LOCATION_OFF", "Cihaz konum hizmetleri kapalı"); return@post}
        for(provider in providers) manager.requestLocationUpdates(provider, 0L, 0f, listener, Looper.getMainLooper())
        main.postDelayed(timeout, 15000)
      } catch(e:Exception) {finished=true; manager.removeUpdates(listener); error(promise,e)}
    }
  }

  private val payloadCallback = object: PayloadCallback() {
    override fun onPayloadReceived(endpointId: String, payload: Payload) {
      val bytes = payload.asBytes() ?: return
      if(bytes.size > 16384 || !connected.contains(endpointId)) return
      event("payload", JSONObject().put("id", endpointId).put("data", String(bytes,Charsets.UTF_8)))
    }
    override fun onPayloadTransferUpdate(endpointId:String, update:PayloadTransferUpdate) {
      if(update.status == PayloadTransferUpdate.Status.FAILURE) event("warning",JSONObject().put("message","Aktarım kesildi; kuyruk yeniden deneyecek."))
    }
  }
  private val lifecycle = object: ConnectionLifecycleCallback() {
    override fun onConnectionInitiated(id:String, info:ConnectionInfo) {
      if(!active || connected.size + pending.size >= 8) {client.rejectConnection(id); return}
      names[id]=info.endpointName.take(30); pending.add(id)
      event("confirm",JSONObject().put("id",id).put("name",names[id]).put("code",info.authenticationDigits))
      main.postDelayed({if(pending.remove(id)) {client.rejectConnection(id); requested.remove(id); event("disconnected",JSONObject().put("id",id))}},60000)
    }
    override fun onConnectionResult(id:String,result:ConnectionResolution) {
      pending.remove(id); requested.remove(id)
      if(result.status.isSuccess && active) {
        connected.add(id); event("connected",JSONObject().put("id",id).put("name",names[id] ?: "Komşu"))
      } else {client.disconnectFromEndpoint(id); event("disconnected",JSONObject().put("id",id))}
    }
    override fun onDisconnected(id:String) {
      connected.remove(id); pending.remove(id); requested.remove(id)
      event("disconnected",JSONObject().put("id",id))
    }
  }
  private val discoveryCallback = object: EndpointDiscoveryCallback() {
    override fun onEndpointFound(id:String, info:DiscoveredEndpointInfo) {
      if(!active) return
      names[id]=info.endpointName.take(30)
      if(!connected.contains(id) && !pending.contains(id) && !requested.contains(id)) event("found",JSONObject().put("id",id).put("name",names[id]))
    }
    override fun onEndpointLost(id:String) {if(!connected.contains(id) && !pending.contains(id)) event("lost",JSONObject().put("id",id))}
  }
  override fun start(name:String,promise:Promise) {
    if(active) {promise.resolve(null); return}
    localName=name.take(30); active=true
    try {
      client.startAdvertising(localName,serviceId,lifecycle,AdvertisingOptions.Builder().setStrategy(Strategy.P2P_CLUSTER).build())
        .addOnSuccessListener {promise.resolve(null)}
        .addOnFailureListener {active=false; promise.reject("RADIO_START",it.message,it)}
    } catch(e:Exception) {active=false; error(promise,e)}
  }
  override fun discovery(enabled:Boolean,promise:Promise) {
    try {
      if(!enabled) {client.stopDiscovery(); promise.resolve(null); return}
      if(!active) {promise.reject("RADIO_OFF","Ağı önce başlatın"); return}
      client.startDiscovery(serviceId,discoveryCallback,DiscoveryOptions.Builder().setStrategy(Strategy.P2P_CLUSTER).build())
        .addOnSuccessListener {promise.resolve(null)}.addOnFailureListener {promise.reject("DISCOVERY",it.message,it)}
    } catch(e:Exception) {error(promise,e)}
  }
  override fun stop(promise:Promise) {
    try {active=false; client.stopDiscovery(); client.stopAdvertising(); client.stopAllEndpoints(); connected.clear(); pending.clear(); requested.clear(); names.clear(); promise.resolve(null)} catch(e:Exception) {error(promise,e)}
  }
  override fun connect(endpointId:String,promise:Promise) {
    if(!active || connected.size + pending.size >= 8 || !names.containsKey(endpointId)) {promise.reject("PEER_UNAVAILABLE","Cihaz artık erişilebilir değil veya bağlantı sınırı dolu"); return}
    requested.add(endpointId)
    try {client.requestConnection(localName,endpointId,lifecycle).addOnSuccessListener {promise.resolve(null)}.addOnFailureListener {requested.remove(endpointId); promise.reject("CONNECT",it.message,it)}} catch(e:Exception) {requested.remove(endpointId); error(promise,e)}
  }
  override fun confirm(endpointId:String,accept:Boolean,promise:Promise) {
    if(!pending.contains(endpointId)) {promise.reject("PEER_EXPIRED","Bağlantı isteğinin süresi doldu"); return}
    if(accept) client.acceptConnection(endpointId,payloadCallback).addOnSuccessListener {promise.resolve(null)}.addOnFailureListener {promise.reject("ACCEPT",it.message,it)}
    else {pending.remove(endpointId); requested.remove(endpointId); client.rejectConnection(endpointId).addOnSuccessListener {promise.resolve(null)}.addOnFailureListener {promise.reject("REJECT",it.message,it)}; event("disconnected",JSONObject().put("id",endpointId))}
  }
  override fun send(endpointId:String,data:String,promise:Promise) {
    if(!connected.contains(endpointId) || data.toByteArray(Charsets.UTF_8).size > 16384) {promise.reject("SEND","Bağlantı yok veya paket sınırı aşıldı"); return}
    try {client.sendPayload(endpointId,Payload.fromBytes(data.toByteArray(Charsets.UTF_8))).addOnSuccessListener {promise.resolve(null)}.addOnFailureListener {promise.reject("SEND",it.message,it)}} catch(e:Exception) {error(promise,e)}
  }
  override fun invalidate() {
    active=false
    try {client.stopDiscovery(); client.stopAdvertising(); client.stopAllEndpoints()} catch(_:Exception) {}
    executor.execute {database.close()}; executor.shutdown()
    main.removeCallbacksAndMessages(null)
    super.invalidate()
  }
}

