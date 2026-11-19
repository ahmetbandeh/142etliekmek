# 1.42 Etliekmek – QR Menü (GitHub + Cloudflare Workers)

Sepetli sipariş menüsü + yönetici paneli. Panelden ürün fiyatını değiştirir, ürünü satışa açar/kapatırsın; müşteriler yeni menüyü anında görür.

## Dosyalar (depoda şu yapı olmalı)
```
wrangler.jsonc      ← Cloudflare ayarı (KV kimliğini buraya yazacaksın)
public/             ← sayfa: index.html, menu.js, menu-loader.js
src/                ← giriş/kaydetme kodu (dokunma)
README.md
```
Depoda eski bir `functions` klasörü varsa sil; artık kullanılmıyor.

## Adım 1 – GitHub'a yükle
Deponu aç → **Add file → Upload files** → zip'i bilgisayarında aç → `wrangler.jsonc` dosyasını, `public` ve `src` klasörlerini sürükle → **Commit changes**. Aynı isimli dosyaların üzerine yazılır.
Sonra depoda `wrangler.jsonc`, `public/index.html` ve `src/index.js` yollarını görmelisin. Klasörlerin hepsi ana seviyede olmalı.

## Adım 2 – KV deposu aç ve kimliğini yaz
1. dash.cloudflare.com → **Storage & Databases → KV** → **Create instance** → ad: `etliekmek-menu` → **Create**
2. Oluşan deponun **ID** değerini kopyala (uzun harf-rakam dizisi).
3. GitHub'da `wrangler.jsonc` dosyasını aç → kalem simgesi → `BURAYA_KV_ID_YAPISTIR` yerine kimliği yapıştır (tırnaklar kalsın) → **Commit changes**

Cloudflare her commit'ten sonra siteyi kendisi yeniden yayınlar.

## Adım 3 – Kullanıcı adı ve şifre
Cloudflare → **Workers & Pages** → projen (`142etliekmek`) → **Settings → Variables and Secrets → Add**. İkisini de **Secret** tipinde ekle:
- `ADMIN_USER` = kullanıcı adın
- `ADMIN_PASS` = şifren

Kaydet ve **Deploy** de. Şifre GitHub'a hiç yüklenmez.

## Kontrol
`https://ADRESİN.workers.dev/api/menu` adresini aç. `{"D":null}` görüyorsan sistem çalışıyor. Sayfanın altındaki **Yönetici girişi** ile gir.

Build ayarları (Settings → Build): **Build command** boş, **Deploy command** `npx wrangler deploy`. Projenin adı `wrangler.jsonc` içindeki `name` ile aynı olmalı (`142etliekmek`).

## Kullanım
- **Yönetici girişi** → ürün adı, fiyat, açıklama düzenle · **Satışta** kutusu: kapatınca ürün "Satışta değil" olur · **Yarım porsiyon** kutusu
- **Kaydet ve yayınla** → müşteriler hemen yeni menüyü görür
- Şifreyi ya da kullanıcı adını değiştirmek için ilgili Secret'ı güncelleyip yeniden dağıt.
- 8 hatalı denemeden sonra giriş 15 dakika kilitlenir.

## Diğer
- WhatsApp numarası: `public/index.html` içinde `WA_NUMBER` yazan yeri bul ve değiştir (`905xxxxxxxxx`).
- Panelden kaydedilmiş menü varsa o geçerlidir. `public/menu.js` yalnızca başlangıç menüsüdür; panelden bir kez kaydettikten sonra orada yaptığın değişiklik görünmez.
- Sipariş WhatsApp'a mesaj olarak gider; sayfada sipariş kaydı tutulmaz. Sepet müşterinin telefonunda saklanır.
