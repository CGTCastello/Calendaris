#!/usr/bin/env python3
"""Extrau les festes locals del text del BOP de Castelló i genera js/dades-locals.js.

Ús:
    python3 eines/extreu_bop.py dades/bop-castello-2027.txt 2027

El text del BOP s'obté del PDF (per exemple amb pypdf). Després de generar
les dades, revisa l'eixida: el script avisa de les entrades que no tenen
exactament dues dates o que cauen en diumenge o en un festiu autonòmic.
"""
import datetime as dt
import json
import re
import sys
import unicodedata

MESOS = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
    "julio": 7, "agosto": 8, "septiembre": 9, "octubre": 10, "noviembre": 11,
    "diciembre": 12,
}

# Nom oficial (valencià o bilingüe) per a cada nom tal com apareix al BOP.
NOMS_OFICIALS = {
    "ALQUERÍAS DEL NIÑO PERDIDO": "les Alqueries",
    "BENICASIM": "Benicàssim",
    "BORRIANA": "Borriana",
    "CASTELLÓN DE LA PLANA": "Castelló de la Plana",
    "CHILCHES": "Xilxes",
    "CHODOS": "Xodos",
    "HERBERS": "Herbers",
    "L’ ALCORA": "l'Alcora",
    "LA JANA": "la Jana",
    "LA LLOSA": "la Llosa",
    "LA MATA DE MORELLA": "la Mata de Morella",
    "LA POBLA DE BENIFASSÀ": "la Pobla de Benifassà",
    "LA POBLA DE TORNESA": "la Pobla Tornesa",
    "LA SALZADELLA": "la Salzadella",
    "LA SERRATELLA": "la Serratella",
    "LA TORRE D’EN BESORA": "la Torre d'en Besora",
    "LA TORRE D’EN DOMÉNEC": "la Torre d'en Doménec",
    "LA VALL D’UIXÓ": "la Vall d'Uixó",
    "LA VILAVELLA": "la Vilavella",
    "LES COVES DE VINROMÀ": "les Coves de Vinromà",
    "EL TORO": "el Toro",
    "LUCENA DEL CID": "Llucena",
    "OROPESA DEL MAR": "Orpesa",
    "PEÑÍSCOLA": "Peníscola",
    "SAN JORGE": "Sant Jordi",
    "SAN RAFAEL DEL RÍO": "Sant Rafel del Riu",
    "SIERRA ENGARCERÁN": "la Serra d'en Galceran",
    "SUERAS": "Suera",
    "USERAS": "les Useres",
    "VALL D’ ALBA": "Vall d'Alba",
    "VILANOVA D’ ALCOLEA": "Vilanova d'Alcolea",
    "VILLAFRANCA DEL CID": "Vilafranca",
    "VILA-REAL": "Vila-real",
}

PARAULES_MINUSCULA = {"de", "del", "la", "les", "el", "lo", "d'en", "y", "i"}


def nom_bonic(nom_bop):
    if nom_bop in NOMS_OFICIALS:
        return NOMS_OFICIALS[nom_bop]
    paraules = nom_bop.replace("’", "'").replace("' ", "'").lower().split()
    eixida = []
    for i, p in enumerate(paraules):
        if i > 0 and p in PARAULES_MINUSCULA:
            eixida.append(p)
        elif p.startswith("d'") and len(p) > 2:
            eixida.append("d'" + p[2:].capitalize())
        else:
            eixida.append("-".join(s.capitalize() for s in p.split("-")))
    return " ".join(eixida)


PREFIXOS = ("día de la festividad de la ", "día de la festividad de ", "día de la festividad del ",
            "festividad de la ", "festividad del ", "festividad de ", "festividad ",
            "fiesta local de ", "fiesta de ")


def neteja_descripcio(text):
    t = text.strip(" ,.;:")
    t = re.sub(r"^y\b", "", t, flags=re.I).strip(" ,.;:")
    t = re.sub(r"\by$", "", t).strip(" ,.;:")
    # Dia de la setmana entre comes: "30 de marzo, martes, “La Doblà”"
    t = re.sub(r"^(lunes|martes|miércoles|jueves|viernes|sábado|domingo)\s*(,\s*|$)", "", t, flags=re.I)
    canvi = True
    while canvi:
        canvi = False
        for pre in PREFIXOS:
            if t.lower().startswith(pre):
                t, canvi = t[len(pre):], True
    t = t.strip(" ,.;:")
    return t[:1].upper() + t[1:] if t else ""


def clau_ordre(nom):
    n = re.sub(r"^(l'|la |les |el )", "", nom.lower())
    return unicodedata.normalize("NFD", n).encode("ascii", "ignore").decode()


def llig_annex(text):
    annex = text.split("RELACIÓN DE FIESTAS LOCALES", 1)[1]
    linies = []
    for l in annex.splitlines():
        l = l.strip()
        if not l or re.fullmatch(r"\d+", l) or l.startswith("Número "):
            continue
        linies.append(l)
    # Ajunta les línies partides: cada entrada comença amb "NOM:" en majúscules.
    entrades = []
    inici = re.compile(r"^([A-ZÁÉÍÓÚÀÈÒÇÑÜ’' .\-]+?)\s*:\s*(.*)$")
    for l in linies[1:]:  # la primera és el títol de l'any
        m = inici.match(l)
        if m and m.group(1).strip() == m.group(1).strip().upper():
            entrades.append([m.group(1), m.group(2)])
        else:
            # Unió de paraules partides amb guionet a final de línia ("festivi -" / "festivi-")
            prev = entrades[-1][1].rstrip()
            if re.search(r"\w\s?-$", prev):
                entrades[-1][1] = re.sub(r"\s?-$", "", prev) + l
            else:
                entrades[-1][1] = prev + " " + l
    return entrades


DATA = re.compile(
    r"(\d{1,2})(?:\s*y\s*(\d{1,2}))?\s*(?:de\s*)?(" + "|".join(MESOS) + r")\b",
    re.I,
)


def processa(entrades, any_):
    municipis = []
    for nom_bop, cos in entrades:
        nom_bop = re.sub(r"\s+", " ", nom_bop).strip()
        cos = re.sub(r"\s+", " ", cos).strip()
        cos = re.sub(r"(\d)de ", r"\1 de ", cos)
        coincidencies = list(DATA.finditer(cos))
        festes = []
        for i, m in enumerate(coincidencies):
            fi = coincidencies[i + 1].start() if i + 1 < len(coincidencies) else len(cos)
            desc = neteja_descripcio(cos[m.end():fi])
            mes = MESOS[m.group(3).lower()]
            dies = [int(m.group(1))] + ([int(m.group(2))] if m.group(2) else [])
            for d in dies:
                festes.append({"data": dt.date(any_, mes, d).isoformat(),
                               "nom": desc})
        municipis.append({"nom": nom_bonic(nom_bop), "nomBop": nom_bop,
                          "festes": festes, "textBop": cos})
    return municipis


def main():
    ruta, any_ = sys.argv[1], int(sys.argv[2])
    text = open(ruta, encoding="utf-8").read()
    municipis = processa(llig_annex(text), any_)
    municipis.sort(key=lambda m: clau_ordre(m["nom"]))

    for m in municipis:
        avisos = []
        if len(m["festes"]) != 2:
            avisos.append(f"{len(m['festes'])} dates")
        for f in m["festes"]:
            d = dt.date.fromisoformat(f["data"])
            if d.weekday() == 6:
                avisos.append(f"{f['data']} és diumenge")
        if avisos:
            print("AVÍS", m["nomBop"], "→", "; ".join(avisos), "|", m["textBop"], file=sys.stderr)

    with open("js/dades-locals.js", "w", encoding="utf-8") as f:
        f.write("// Generat amb eines/extreu_bop.py a partir del BOP de Castelló núm. 136, de 10/11/2026.\n")
        f.write("// Festes locals 2027 de la província de Castelló.\n")
        f.write("window.FESTES_LOCALS = ")
        json.dump([{k: m[k] for k in ("nom", "nomBop", "festes")} for m in municipis],
                  f, ensure_ascii=False, indent=1)
        f.write(";\n")
    print(len(municipis), "municipis")


if __name__ == "__main__":
    main()
