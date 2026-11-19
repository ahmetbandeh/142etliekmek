// Yönetim panelinden kaydedilmiş menü varsa onu kullanır; yoksa menu.js'teki menü geçerli kalır.
try {
  var x = new XMLHttpRequest();
  x.open('GET', '/api/menu?_=' + Date.now(), false);
  x.send();
  if (x.status === 200) {
    var j = JSON.parse(x.responseText);
    if (j && Array.isArray(j.D) && j.D.length) D = j.D;
  }
} catch (e) {}
