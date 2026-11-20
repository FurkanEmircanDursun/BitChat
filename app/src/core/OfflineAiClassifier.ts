import type { Analysis, Resource } from './types';

/** Deterministic offline Turkish/English rules, not a trained medical model. */
export class OfflineAiClassifier {
  static normalize(text: string): string {
    return text
      .toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
  static classify(text: string): Analysis {
    const t = this.normalize(text);
    const riskText = t.replace(
      /\b(enkaz altinda|yarali|mahsur|kanama|yangin)\s+(degilim|yok|yoktur|degil)\b/g,
      '',
    );
    const urgent =
      /\b(sos|imdat|enkaz|kanama|yarali|mahsur|bogul|nefes alam|yangin|kurtarin|guvende degilim|yardim edin|acil yardim|ambulans|trapped|bleeding|help me)\w*/.test(
        riskText,
      );
    const training = /^\s*(tatbikat|ornek|deneme)\s*[:\-]/.test(t);
    const resourceRules: [Resource, RegExp][] = [
      ['Su', /\b(su|water)\b/],
      ['Gıda', /\b(gida|yemek|ekmek|mama|food)\b/],
      ['Barınma', /\b(cadir|battaniye|barinma|tent|shelter)\b/],
      ['Sağlık', /\b(ilac|saglik|doktor|tibbi|medicine)\b/],
      ['Enerji', /\b(sarj|powerbank|pil|elektrik|battery)\b/],
    ];
    const resource =
      resourceRules.find(([, pattern]) => pattern.test(t))?.[0] ?? 'Diğer';
    const need = /\b(lazim|ihtiyac|araniyor|yok|gerekiyor|need)\b/.test(t);
    const offer =
      /\b(var|fazla|verebilirim|paylas|dagit|sunabilirim|available|offer)\w*/.test(
        t,
      );
    const intent = need
      ? 'need'
      : offer && resource !== 'Diğer'
      ? 'offer'
      : 'message';
    if (
      urgent &&
      (!training || /\b(nefes alam|kanama|kurtarin|imdat)\w*/.test(riskText))
    ) {
      return {
        priority: 1,
        intent,
        resource,
        reason: 'Acil durum ifadesi algılandı. Göndermeden önce kontrol edin.',
      };
    }
    if (intent !== 'message' || resource !== 'Diğer') {
      return {
        priority: 2,
        intent,
        resource,
        reason: 'Kaynak veya ihtiyaç ifadesi algılandı.',
      };
    }
    return {
      priority: 3,
      intent: 'message',
      resource,
      reason: 'Genel mesaj. Önceliği elle değiştirebilirsiniz.',
    };
  }
}
