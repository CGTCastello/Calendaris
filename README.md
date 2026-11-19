# Calendari laboral 2027 · CGT Castelló

Web estàtica (GitHub Pages) que genera el calendari laboral 2027 en PDF per a qualsevol municipi de la província de Castelló: 12 festes nacionals i autonòmiques de la Comunitat Valenciana + les 2 festes locals del municipi (14 en total).

## Com funciona

- `index.html` — la pàgina: selector de municipi, llista de festes, vista prèvia i botó de descàrrega.
- `js/festius.js` — festes nacionals i autonòmiques i utilitats de dates (setmanes ISO, noms dels mesos).
- `js/dades-locals.js` — festes locals dels 135 municipis (generat, no s'edita a mà).
- `js/calendari-pdf.js` — genera el PDF A4 vectorial amb [jsPDF](https://github.com/parallax/jsPDF); les fonts Anton i Open Sans es carreguen de jsDelivr (Fontsource) i, si falla, de la carpeta `fonts/` si hi poses els TTF.
- `css/estil.css` — estil segons el sistema de disseny de CGT Castelló (roig, negre, groc i blanc; Anton + Open Sans; sense cantonades arredonides).

Colors al calendari: **roig** nacional, **negre** autonòmic, **groc** local.

## Fonts de les dades

- Decret 42/2026, de 20 de març, del Consell: calendari laboral 2027 de la Comunitat Valenciana.
- BOP de Castelló núm. 136, de 10 de novembre de 2026 (resolució 04772-2026): festes locals de la província de Castelló.

## Actualitzar per a un altre any

1. Extrau el text del PDF del BOP (per exemple amb `pypdf`) i desa'l a `dades/bop-castello-AAAA.txt`.
2. Executa:

   ```bash
   python3 eines/extreu_bop.py dades/bop-castello-AAAA.txt AAAA
   ```

   El script avisa per la consola de les entrades que no tenen dues dates o que cauen en diumenge.
3. Actualitza `ANY_CALENDARI` i `FESTES_GENERALS` a `js/festius.js`, i les fonts a `index.html` i `js/calendari-pdf.js`.

## Provar-la en local

```bash
python3 -m http.server 8765
```

I obri http://localhost:8765.

## Publicar a GitHub Pages

Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`.
