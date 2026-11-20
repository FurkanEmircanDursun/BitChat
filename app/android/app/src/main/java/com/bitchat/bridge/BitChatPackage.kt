package com.bitchat.bridge

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class BitChatPackage: BaseReactPackage() {
  override fun getModule(name:String, context:ReactApplicationContext): NativeModule? = if(name == "BitChat") BitChatModule(context) else null
  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf("BitChat" to ReactModuleInfo("BitChat", "BitChat", false, false, false, true))
  }
}
