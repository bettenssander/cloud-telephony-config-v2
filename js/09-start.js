// Opstarten: standaardrijen aanmaken, eventueel bewaarde invoer terugzetten en de eerste stap tonen.

// Standaardrijen: één lege nummerrij en drie lege rijen in het nummerplan.
addNr();
addP();
addP();
addP();

// Bewaarde invoer uit dit tabblad terugzetten (overschrijft de lege standaardrijen; zie 08-opslag.js).
restoreState();

// Klikbare stappenbalk: terugspringen kan altijd, vooruit springen controleert de stappen ertussen.
document.querySelectorAll("#bar i").forEach(function (e, k) {
  e.title = k <= step ? "Ga naar deze stap" : "Ga naar deze stap (de stappen ertussen worden gecontroleerd)";
  e.onclick = function () {
    goto(k);
  };
});
show(step);
