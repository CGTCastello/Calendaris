// Calendari laboral 2027: 12 festes nacionals i autonòmiques del País Valencià
// (Decret 42/2026, de 20 de març, del Consell) + 2 festes locals de cada municipi.
window.ANY_CALENDARI = 2027;

window.FESTES_GENERALS = [
  { data: "2027-01-01", nom: "Cap d'Any", tipus: "nacional" },
  { data: "2027-01-06", nom: "Reis", tipus: "nacional" },
  { data: "2027-03-19", nom: "Sant Josep", tipus: "autonomic" },
  { data: "2027-03-26", nom: "Divendres Sant", tipus: "nacional" },
  { data: "2027-03-29", nom: "Dilluns de Pasqua", tipus: "autonomic" },
  { data: "2027-05-01", nom: "Festa del Treball", tipus: "nacional" },
  { data: "2027-10-09", nom: "Dia del País Valencià", tipus: "autonomic" },
  { data: "2027-10-12", nom: "Festa Nacional d'Espanya", tipus: "nacional" },
  { data: "2027-11-01", nom: "Tots Sants", tipus: "nacional" },
  { data: "2027-12-06", nom: "Dia de la Constitució Espanyola", tipus: "nacional" },
  { data: "2027-12-08", nom: "Immaculada Concepció", tipus: "nacional" },
  { data: "2027-12-25", nom: "Nativitat del Senyor", tipus: "nacional" },
];

window.TIPUS_FESTA = {
  nacional: { nom: "Nacional" },
  autonomic: { nom: "Autonòmic (País Valencià)" },
  local: { nom: "Local" },
};

window.MESOS = ["gener", "febrer", "març", "abril", "maig", "juny", "juliol",
  "agost", "setembre", "octubre", "novembre", "desembre"];
window.DIES_SETMANA = ["DLL", "DM", "DC", "DJ", "DV", "DS", "DG"];

// "1 de gener", "5 d'abril"
window.dataLlarga = function (iso) {
  const [, m, d] = iso.split("-").map(Number);
  const mes = window.MESOS[m - 1];
  return d + (/^[aeiou]/.test(mes) ? " d'" : " de ") + mes;
};

// Totes les festes d'un municipi (o només les generals si no n'hi ha), ordenades per data.
window.festesDe = function (municipi) {
  const locals = municipi
    ? municipi.festes.map((f) => ({ data: f.data, nom: f.nom || "Festa local", tipus: "local" }))
    : [];
  return [...window.FESTES_GENERALS, ...locals].sort((a, b) => a.data.localeCompare(b.data));
};

// Setmana ISO 8601 (la que es fa servir al calendari laboral).
window.setmanaISO = function (any, mes, dia) {
  const d = new Date(Date.UTC(any, mes, dia));
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const inici = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - inici) / 86400000 + 1) / 7);
};

// Files de setmanes d'un mes: [{ setmana, dies: [null|1..31 x7] }]
window.setmanesDelMes = function (any, mes) {
  const primer = new Date(Date.UTC(any, mes, 1));
  const diesMes = new Date(Date.UTC(any, mes + 1, 0)).getUTCDate();
  const despl = (primer.getUTCDay() + 6) % 7; // dilluns = 0
  const files = [];
  let fila = new Array(7).fill(null);
  for (let d = 1; d <= diesMes; d++) {
    const col = (despl + d - 1) % 7;
    fila[col] = d;
    if (col === 6 || d === diesMes) {
      const primerDia = fila.find((x) => x !== null);
      files.push({ setmana: window.setmanaISO(any, mes, primerDia), dies: fila });
      fila = new Array(7).fill(null);
    }
  }
  return files;
};
