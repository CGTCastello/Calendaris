// Genera el PDF A4 del calendari laboral amb jsPDF (vectorial, amb les fonts incrustades).
(function () {
  const COLOR = {
    roig: [228, 33, 39],
    negre: [17, 17, 17],
    groc: [233, 232, 76],
    blanc: [255, 255, 255],
    gris: [95, 94, 89],
    linia: [228, 226, 221],
  };
  // Nacional: roig · Autonòmic: negre · Local: groc (text negre)
  const ESTIL_FESTA = {
    nacional: { fons: COLOR.roig, text: COLOR.blanc },
    autonomic: { fons: COLOR.negre, text: COLOR.blanc },
    local: { fons: COLOR.groc, text: COLOR.negre },
  };

  const FONTS = [
    { fitxer: "fonts/Anton-Regular.ttf", url: "https://cdn.jsdelivr.net/fontsource/fonts/anton@latest/latin-400-normal.ttf", familia: "Anton", estil: "normal" },
    { fitxer: "fonts/OpenSans-Regular.ttf", url: "https://cdn.jsdelivr.net/fontsource/fonts/open-sans@latest/latin-400-normal.ttf", familia: "OpenSans", estil: "normal" },
    { fitxer: "fonts/OpenSans-Bold.ttf", url: "https://cdn.jsdelivr.net/fontsource/fonts/open-sans@latest/latin-700-normal.ttf", familia: "OpenSans", estil: "bold" },
    { fitxer: "fonts/OpenSans-ExtraBold.ttf", url: "https://cdn.jsdelivr.net/fontsource/fonts/open-sans@latest/latin-800-normal.ttf", familia: "OpenSansXB", estil: "normal" },
  ];

  let recursos = null; // { fonts: [{...font, base64}], logo: dataURL }

  function base64(buffer) {
    const bytes = new Uint8Array(buffer);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(bin);
  }

  async function baixa(urls) {
    for (const url of urls) {
      try {
        const r = await fetch(url);
        if (r.ok) return await r.arrayBuffer();
      } catch (e) { /* prova la següent */ }
    }
    throw new Error("No s'ha pogut carregar " + urls[0]);
  }

  async function carregaRecursos() {
    if (recursos) return recursos;
    const fonts = await Promise.all(FONTS.map(async (f) => ({ ...f, base64: base64(await baixa([f.url, f.fitxer])) })));
    const logo = "data:image/png;base64," + base64(await baixa(["assets/cgt-castello-color.png"]));
    recursos = { fonts, logo };
    return recursos;
  }

  function font(doc, nom, mida) {
    if (nom === "anton") doc.setFont("Anton", "normal");
    else if (nom === "xb") doc.setFont("OpenSansXB", "normal");
    else if (nom === "bold") doc.setFont("OpenSans", "bold");
    else doc.setFont("OpenSans", "normal");
    doc.setFontSize(mida);
  }

  function color(doc, c) { doc.setTextColor(c[0], c[1], c[2]); }
  function ple(doc, c) { doc.setFillColor(c[0], c[1], c[2]); }
  function traç(doc, c) { doc.setDrawColor(c[0], c[1], c[2]); }

  // Text centrat amb espaiat entre lletres (charSpace en mm)
  function textEspaiat(doc, text, xCentre, y, espai) {
    doc.setCharSpace(espai);
    const w = doc.getTextWidth(text) + espai * (text.length - 1);
    doc.text(text, xCentre - w / 2, y);
    doc.setCharSpace(0);
  }

  function ampleEspaiat(doc, text, espai) {
    return doc.getTextWidth(text) + espai * (text.length - 1);
  }

  // Divideix "negreta + normal" en línies d'ample màxim
  function liniesFesta(doc, data, nom, ample) {
    font(doc, "bold", 7);
    const wData = doc.getTextWidth(data + " ");
    font(doc, "regular", 7);
    const paraules = nom.split(" ");
    const linies = [];
    let actual = "";
    let max = ample - wData;
    for (const p of paraules) {
      const prova = actual ? actual + " " + p : p;
      if (doc.getTextWidth(prova) > max && actual) {
        linies.push(actual);
        actual = p;
        max = ample;
      } else {
        actual = prova;
      }
    }
    linies.push(actual);
    return { wData, linies };
  }

  async function genera(municipi) {
    const { jsPDF } = window.jspdf;
    const r = await carregaRecursos();
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    for (const f of r.fonts) {
      const nomFitxer = f.familia + "-" + f.estil + ".ttf";
      doc.addFileToVFS(nomFitxer, f.base64);
      doc.addFont(nomFitxer, f.familia, f.estil);
    }

    const any = window.ANY_CALENDARI;
    const festes = window.festesDe(municipi);
    const perData = Object.fromEntries(festes.map((f) => [f.data, f]));
    const W = 210, M = 14;

    doc.setProperties({
      title: "Calendari laboral " + any + (municipi ? " · " + municipi.nom : " · Autonòmic"),
      author: "CGT Castelló",
      subject: "Calendari laboral " + any,
    });

    // ── Capçalera
    doc.addImage(r.logo, "PNG", M, 13, 30, 30 * 640 / 1075, "logo", "FAST");
    color(doc, COLOR.negre);
    font(doc, "anton", 34);
    textEspaiat(doc, "CALENDARI", W / 2 + 8, 25, 3.2);
    textEspaiat(doc, "LABORAL " + any, W / 2 + 8, 38.5, 3.2);
    const subtitol = (municipi ? municipi.nom : "Autonòmic").toUpperCase();
    let mida = 18;
    font(doc, "anton", mida);
    while (ampleEspaiat(doc, subtitol, 1.2) > 130 && mida > 10) { mida -= 0.5; font(doc, "anton", mida); }
    color(doc, COLOR.roig);
    textEspaiat(doc, subtitol, W / 2 + 8, 48, 1.2);

    // ── Mesos (3 columnes x 4 files)
    const gap = 8;
    const colW = (W - 2 * M - 2 * gap) / 3;
    const wSet = 5;
    const wDia = (colW - wSet) / 7;
    const filaH = 4.35;
    const blocH = 40;
    const y0 = 55;

    for (let mes = 0; mes < 12; mes++) {
      const x = M + (mes % 3) * (colW + gap);
      const y = y0 + Math.floor(mes / 3) * blocH;

      color(doc, COLOR.negre);
      font(doc, "anton", 14);
      textEspaiat(doc, window.MESOS[mes].toUpperCase(), x + colW / 2, y + 5, 0.4);

      font(doc, "xb", 5.6);
      window.DIES_SETMANA.forEach((d, i) => {
        color(doc, i === 6 ? COLOR.roig : COLOR.negre);
        doc.text(d, x + wSet + wDia * i + wDia / 2, y + 10.2, { align: "center" });
      });
      traç(doc, COLOR.negre);
      doc.setLineWidth(0.3);
      doc.line(x, y + 11.6, x + colW, y + 11.6);

      window.setmanesDelMes(any, mes).forEach((fila, f) => {
        const yb = y + 15.6 + f * filaH;
        font(doc, "regular", 5);
        color(doc, COLOR.gris);
        doc.text(String(fila.setmana), x + 0.4, yb);
        fila.dies.forEach((dia, col) => {
          if (dia === null) return;
          const iso = any + "-" + String(mes + 1).padStart(2, "0") + "-" + String(dia).padStart(2, "0");
          const cx = x + wSet + wDia * col + wDia / 2;
          const festa = perData[iso];
          if (festa) {
            const e = ESTIL_FESTA[festa.tipus];
            ple(doc, e.fons);
            doc.rect(cx - 2.6, yb - 3.05, 5.2, 4.0, "F");
            font(doc, "bold", 7.4);
            color(doc, e.text);
          } else if (col === 6) {
            font(doc, "bold", 7.4);
            color(doc, COLOR.roig);
          } else if (col === 5) {
            font(doc, "bold", 7.4);
            color(doc, COLOR.negre);
          } else {
            font(doc, "regular", 7.4);
            color(doc, COLOR.negre);
          }
          doc.text(String(dia), cx, yb, { align: "center" });
        });
      });
    }

    // ── Llista de festes (3 columnes)
    let yLlista = y0 + 4 * blocH + 1;
    const perCol = Math.ceil(festes.length / 3);
    let yMax = yLlista;
    for (let c = 0; c < 3; c++) {
      const x = M + c * (colW + gap);
      let y = yLlista;
      festes.slice(c * perCol, (c + 1) * perCol).forEach((f) => {
        const data = window.dataLlarga(f.data) + ",";
        const { wData, linies } = liniesFesta(doc, data, f.nom, colW - 3);
        const h = linies.length * 3.3;
        ple(doc, ESTIL_FESTA[f.tipus].fons);
        doc.rect(x, y - 2.7, 1.1, h + 0.4, "F");
        if (f.tipus === "local") { traç(doc, COLOR.negre); doc.setLineWidth(0.1); doc.rect(x, y - 2.7, 1.1, h + 0.4, "S"); }
        color(doc, COLOR.negre);
        font(doc, "bold", 7);
        doc.text(data, x + 2.6, y);
        font(doc, "regular", 7);
        linies.forEach((l, i) => doc.text(l, x + 2.6 + (i === 0 ? wData : 0), y + i * 3.3));
        y += h + 1.6;
      });
      yMax = Math.max(yMax, y);
    }

    // ── Llegenda
    let yLl = yMax + 2;
    let xLl = M;
    ["nacional", "autonomic", "local"].forEach((t) => {
      ple(doc, ESTIL_FESTA[t].fons);
      doc.rect(xLl, yLl - 3, 4, 4, "F");
      if (t === "local") { traç(doc, COLOR.negre); doc.setLineWidth(0.1); doc.rect(xLl, yLl - 3, 4, 4, "S"); }
      font(doc, "regular", 7.5);
      color(doc, COLOR.negre);
      doc.text(window.TIPUS_FESTA[t].nom, xLl + 5.5, yLl);
      xLl += colW + gap;
    });

    // ── Filet + notes + peu
    const yFilet = yLl + 5;
    ple(doc, COLOR.negre);
    doc.rect(M, yFilet, W - 2 * M, 0.8, "F");

    font(doc, "xb", 7.5);
    color(doc, COLOR.negre);
    doc.text("NOTES:", M, yFilet + 7);
    traç(doc, COLOR.gris);
    doc.setLineWidth(0.15);
    for (let i = 0; i < 4; i++) {
      const yn = yFilet + 13 + i * 5.5;
      doc.line(M, yn, M + 95, yn);
    }

    const xPeu = 116;
    const yPeu = yFilet + 6;
    const logoW = 22;
    doc.addImage(r.logo, "PNG", xPeu, yPeu, logoW, logoW * 640 / 1075, "logo", "FAST");
    const xt = xPeu + logoW + 4;
    font(doc, "xb", 7);
    color(doc, COLOR.negre);
    doc.text("CONFEDERACIÓ GENERAL DEL TREBALL", xt, yPeu + 2.5);
    doc.text("FEDERACIÓ INTERCOMARCAL DE CASTELLÓ", xt, yPeu + 5.6);
    font(doc, "bold", 5.6);
    doc.text("Carrer Borriol, 2, baix B · C.P. 12006 · Castelló de la Plana", xt, yPeu + 8.8);
    doc.text("Telf: 964 25 06 36 · 658 39 90 14", xt, yPeu + 11.5);
    doc.text("castello@cgtpv.org", xt, yPeu + 14.2);
    font(doc, "anton", 13);
    color(doc, COLOR.negre);
    doc.text("CGTCASTELLO.ORG", xt, yPeu + 20.5);

    return doc;
  }

  function slug(text) {
    return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  window.CalendariPDF = {
    carregaRecursos,
    async descarrega(municipi) {
      const doc = await genera(municipi);
      doc.save("calendari-laboral-" + window.ANY_CALENDARI + "-" + slug(municipi ? municipi.nom : "autonomic") + ".pdf");
    },
    async blobURL(municipi) {
      const doc = await genera(municipi);
      return URL.createObjectURL(doc.output("blob"));
    },
  };
})();
