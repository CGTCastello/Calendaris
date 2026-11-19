(function () {
  const any = window.ANY_CALENDARI;
  const municipis = window.FESTES_LOCALS;
  const $select = document.getElementById("municipi");
  const $boto = document.getElementById("descarrega");
  const $estat = document.getElementById("estat");
  const $llista = document.getElementById("llista-festes");
  const $titol = document.getElementById("titol-festes");
  const $cal = document.getElementById("calendari");
  const DIES_LLARGS = ["diumenge", "dilluns", "dimarts", "dimecres", "dijous", "divendres", "dissabte"];

  // Selector: opció sense municipi (només festes autonòmiques) + els municipis
  const opcioGeneral = new Option("Cap municipi (només festes autonòmiques)", "");
  $select.add(opcioGeneral);
  municipis.forEach((m, i) => $select.add(new Option(m.nom, String(i))));

  const municipiTriat = () => ($select.value === "" ? null : municipis[Number($select.value)]);

  function pintaLlista(municipi) {
    const festes = window.festesDe(municipi);
    $titol.textContent = festes.length + " festes" + (municipi ? " · " + municipi.nom : "");
    $llista.innerHTML = "";
    festes.forEach((f) => {
      const d = new Date(f.data + "T12:00:00");
      const li = document.createElement("li");
      li.innerHTML = '<span class="barra ' + f.tipus + '"></span><span><strong></strong> <span class="nom"></span><br><span class="dia"></span></span>';
      li.querySelector("strong").textContent = window.dataLlarga(f.data) + ",";
      li.querySelector(".nom").textContent = f.nom;
      li.querySelector(".dia").textContent = DIES_LLARGS[d.getDay()] + " · " + window.TIPUS_FESTA[f.tipus].nom;
      $llista.appendChild(li);
    });
  }

  function pintaCalendari(municipi) {
    const perData = Object.fromEntries(window.festesDe(municipi).map((f) => [f.data, f]));
    $cal.innerHTML = "";
    for (let mes = 0; mes < 12; mes++) {
      const div = document.createElement("div");
      div.className = "mes";
      const h3 = document.createElement("h3");
      h3.textContent = window.MESOS[mes];
      div.appendChild(h3);
      const taula = document.createElement("table");
      const cap = "<thead><tr><th class=\"set\"></th>" + window.DIES_SETMANA.map((d) => "<th>" + d + "</th>").join("") + "</tr></thead>";
      const cos = window.setmanesDelMes(any, mes).map((fila) => {
        return "<tr><td class=\"set\">" + fila.setmana + "</td>" + fila.dies.map((dia, col) => {
          if (dia === null) return "<td></td>";
          const iso = any + "-" + String(mes + 1).padStart(2, "0") + "-" + String(dia).padStart(2, "0");
          const f = perData[iso];
          const classes = [col === 5 ? "ds" : "", col === 6 ? "dg" : "", f ? "festa " + f.tipus : ""].join(" ").trim();
          const titol = f ? ' title="' + f.nom.replace(/"/g, "&quot;") + '"' : "";
          return "<td class=\"" + classes + "\"" + titol + "><span>" + dia + "</span></td>";
        }).join("") + "</tr>";
      }).join("");
      taula.innerHTML = cap + "<tbody>" + cos + "</tbody>";
      div.appendChild(taula);
      $cal.appendChild(div);
    }
  }

  function actualitza() {
    const m = municipiTriat();
    pintaLlista(m);
    pintaCalendari(m);
    $estat.textContent = "";
    try { localStorage.setItem("cgt-calendari-municipi", m ? m.nomBop : ""); } catch (e) { /* sense emmagatzematge */ }
  }

  $select.addEventListener("change", actualitza);

  $boto.addEventListener("click", async () => {
    $boto.disabled = true;
    $estat.textContent = "Generant el PDF…";
    try {
      await window.CalendariPDF.descarrega(municipiTriat());
      $estat.textContent = "PDF descarregat.";
    } catch (e) {
      console.error(e);
      $estat.textContent = "No s'ha pogut generar el PDF. Comprova la connexió i torna-ho a provar.";
    } finally {
      $boto.disabled = false;
    }
  });

  // Recupera l'últim municipi triat
  try {
    const desat = localStorage.getItem("cgt-calendari-municipi");
    const i = municipis.findIndex((m) => m.nomBop === desat);
    if (i >= 0) $select.value = String(i);
  } catch (e) { /* res */ }

  actualitza();
  // Precarrega fonts i logo perquè la descàrrega siga immediata
  window.CalendariPDF.carregaRecursos().catch(() => {});

  // Dins d'un iframe: avisa la pàgina mare de l'altura perquè l'iframe no tinga barra de desplaçament
  if (window.parent !== window) {
    document.documentElement.classList.add("incrustat");
    let ultima = 0;
    const avisa = () => {
      const alcada = Math.ceil(document.documentElement.getBoundingClientRect().height);
      if (alcada !== ultima) {
        ultima = alcada;
        window.parent.postMessage({ tipus: "cgt-calendari-alcada", alcada }, "*");
      }
    };
    new ResizeObserver(avisa).observe(document.documentElement);
    window.addEventListener("load", avisa);
    avisa();
  }
})();
