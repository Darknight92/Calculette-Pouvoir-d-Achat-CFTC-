/*
 * Calculette pouvoir d'achat CFTC BPCE
 * Reprend la logique de la macro « Calculer » du classeur Excel :
 *   augmentation cumulée = Π (1 + collective) × (1 + individuelle) − 1
 *   inflation cumulée    = Π (1 + inflation) − 1
 *   écart                = augmentation cumulée − inflation cumulée
 * sur les années allant de l'année d'arrivée à la dernière année connue.
 */
(function () {
  "use strict";

  const ANNEES = Object.keys(INFLATION_INSEE).map(Number).sort((a, b) => a - b);

  const formatPct = new Intl.NumberFormat("fr-FR", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formatEuro = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

  const el = (id) => document.getElementById(id);
  const selectAnnee = el("annee");
  const lignes = el("lignes");
  const formulaire = el("formulaire");
  const erreur = el("erreur");
  const resultats = el("resultats");
  const champSalaire = el("salaire");

  let dernierResultat = null;

  // --- Construction de l'interface -------------------------------------

  ANNEES.forEach((annee) => {
    const option = document.createElement("option");
    option.value = annee;
    option.textContent = annee;
    selectAnnee.appendChild(option);

    const tr = document.createElement("tr");
    tr.dataset.annee = annee;
    tr.innerHTML =
      `<td class="annee">${annee}</td>` +
      `<td><span class="champ"><input type="text" inputmode="decimal" autocomplete="off" size="6" ` +
      `id="coll-${annee}" aria-label="Taux d'augmentation collective ${annee} en %" placeholder="0,00"></span></td>` +
      `<td><span class="champ"><input type="text" inputmode="decimal" autocomplete="off" size="6" ` +
      `id="indiv-${annee}" aria-label="Taux d'augmentation individuelle ${annee} en %" placeholder="0,00"></span></td>` +
      `<td class="inflation">${formatPct.format(INFLATION_INSEE[annee] / 100)}</td>`;
    lignes.appendChild(tr);
  });

  el("annee-courante").textContent = new Date().getFullYear();

  // --- Calculs ----------------------------------------------------------

  function anneesPeriode(depuis) {
    return ANNEES.filter((a) => a >= depuis);
  }

  function inflationCumulee(depuis) {
    return anneesPeriode(depuis).reduce((acc, a) => acc * (1 + INFLATION_INSEE[a] / 100), 1) - 1;
  }

  // Convertit la saisie (« 1,5 », « 1.5 % », vide) en taux décimal ; NaN si invalide.
  function lireTaux(valeur) {
    const texte = valeur.replace(/\s|%/g, "").replace(",", ".");
    if (texte === "") return 0;
    if (!/^[-+]?\d*\.?\d+$/.test(texte)) return NaN;
    return Number(texte) / 100;
  }

  function lireSaisies(depuis) {
    const invalides = [];
    const parAnnee = {};
    anneesPeriode(depuis).forEach((a) => {
      const coll = el(`coll-${a}`);
      const indiv = el(`indiv-${a}`);
      const tc = lireTaux(coll.value);
      const ti = lireTaux(indiv.value);
      coll.setAttribute("aria-invalid", Number.isNaN(tc));
      indiv.setAttribute("aria-invalid", Number.isNaN(ti));
      if (Number.isNaN(tc)) invalides.push(coll);
      if (Number.isNaN(ti)) invalides.push(indiv);
      parAnnee[a] = { collective: tc, individuelle: ti };
    });
    return { invalides, parAnnee };
  }

  // --- Mise à jour de l'affichage --------------------------------------

  function majPeriode() {
    const depuis = Number(selectAnnee.value);
    lignes.querySelectorAll("tr").forEach((tr) => {
      const hors = Number(tr.dataset.annee) < depuis;
      tr.classList.toggle("hors-periode", hors);
      tr.querySelectorAll("input").forEach((input) => {
        input.disabled = hors;
        if (hors) input.removeAttribute("aria-invalid");
      });
    });
    el("alerte-sans-augmentation").textContent =
      `Sans augmentation depuis ${depuis}, votre pouvoir d'achat a baissé de ` +
      `${formatPct.format(inflationCumulee(depuis))}`;
  }

  function calculer() {
    const depuis = Number(selectAnnee.value);
    const { invalides, parAnnee } = lireSaisies(depuis);

    if (invalides.length) {
      erreur.textContent =
        "Attention, les taux d'augmentation doivent être indiqués uniquement sous forme de valeurs numériques.";
      erreur.hidden = false;
      resultats.hidden = true;
      invalides[0].focus();
      return;
    }
    erreur.hidden = true;

    // Indices base 100 pour le graphique, l'année précédant l'arrivée
    const points = [{ annee: depuis - 1, salaire: 100, prix: 100 }];
    let indiceSalaire = 1;
    let indicePrix = 1;
    anneesPeriode(depuis).forEach((a) => {
      indiceSalaire *= (1 + parAnnee[a].collective) * (1 + parAnnee[a].individuelle);
      indicePrix *= 1 + INFLATION_INSEE[a] / 100;
      points.push({ annee: a, salaire: indiceSalaire * 100, prix: indicePrix * 100 });
    });

    const augmentation = indiceSalaire - 1;
    const inflation = indicePrix - 1;
    const ecart = augmentation - inflation;

    el("res-augmentation").textContent = formatPct.format(augmentation);
    el("res-inflation").textContent = formatPct.format(inflation);

    const message = el("message");
    message.textContent =
      `Depuis ${depuis}, votre pouvoir d'achat a ${ecart < 0 ? "baissé" : "augmenté"} de ` +
      formatPct.format(Math.abs(ecart));
    message.className = "message " + (ecart < 0 ? "message--baisse" : "message--hausse");

    dernierResultat = { depuis, indiceSalaire, indicePrix };
    majEuros();
    dessinerGraphique(points);

    resultats.hidden = false;
    resultats.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function majEuros() {
    const zone = el("message-euros");
    const salaire = Number(champSalaire.value.replace(/\s|€/g, "").replace(",", "."));
    if (!dernierResultat || !salaire || salaire <= 0) {
      zone.hidden = true;
      return;
    }
    // Salaire qui aurait suivi exactement l'inflation depuis l'arrivée
    const { depuis, indiceSalaire, indicePrix } = dernierResultat;
    const salaireCible = (salaire / indiceSalaire) * indicePrix;
    const difference = salaire - salaireCible;
    zone.textContent =
      difference < 0
        ? `Pour retrouver votre pouvoir d'achat de ${depuis}, il vous manque environ ` +
          `${formatEuro.format(-difference)} brut par an (salaire cible : ${formatEuro.format(salaireCible)}).`
        : `Votre salaire dépasse d'environ ${formatEuro.format(difference)} brut par an ` +
          `le niveau qui aurait simplement suivi l'inflation depuis ${depuis}.`;
    zone.hidden = false;
  }

  function reinitialiser() {
    lignes.querySelectorAll("input").forEach((input) => {
      input.value = "";
      input.removeAttribute("aria-invalid");
    });
    selectAnnee.value = ANNEES[0];
    champSalaire.value = "";
    erreur.hidden = true;
    resultats.hidden = true;
    dernierResultat = null;
    majPeriode();
  }

  // --- Graphique SVG ----------------------------------------------------

  function dessinerGraphique(points) {
    const L = 640, H = 260;
    const m = { haut: 16, droite: 16, bas: 28, gauche: 44 };
    const valeurs = points.flatMap((p) => [p.salaire, p.prix]);
    let min = Math.floor(Math.min(...valeurs) / 5) * 5;
    let max = Math.ceil(Math.max(...valeurs) / 5) * 5;
    if (max - min < 10) max = min + 10;

    const x = (i) => m.gauche + (i * (L - m.gauche - m.droite)) / Math.max(points.length - 1, 1);
    const y = (v) => H - m.bas - ((v - min) * (H - m.haut - m.bas)) / (max - min);
    const chemin = (cle) => points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[cle]).toFixed(1)}`).join("");

    const pas = (max - min) / 5 >= 5 ? Math.ceil((max - min) / 5 / 5) * 5 : 2;
    let grille = "";
    for (let v = min; v <= max; v += pas) {
      grille +=
        `<line x1="${m.gauche}" x2="${L - m.droite}" y1="${y(v)}" y2="${y(v)}" stroke="#e3e7ee"/>` +
        `<text x="${m.gauche - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    }
    const etiquettes = points
      .map((p, i) => (points.length > 8 && i % 2 ? "" : `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${p.annee}</text>`))
      .join("");
    const dernier = points.length - 1;
    const pointsFin =
      `<circle cx="${x(dernier)}" cy="${y(points[dernier].salaire)}" r="4" fill="#0f3f93"/>` +
      `<circle cx="${x(dernier)}" cy="${y(points[dernier].prix)}" r="4" fill="#d50000"/>`;

    el("graphique").innerHTML =
      `<svg viewBox="0 0 ${L} ${H}" role="img" aria-label="Évolution de votre rémunération comparée à celle des prix">` +
      grille + etiquettes +
      `<path d="${chemin("prix")}" fill="none" stroke="#d50000" stroke-width="2.5" stroke-linejoin="round"/>` +
      `<path d="${chemin("salaire")}" fill="none" stroke="#0f3f93" stroke-width="2.5" stroke-linejoin="round"/>` +
      pointsFin + `</svg>`;
  }

  // --- Évènements -------------------------------------------------------

  selectAnnee.addEventListener("change", () => {
    majPeriode();
    resultats.hidden = true;
  });
  formulaire.addEventListener("submit", (e) => {
    e.preventDefault();
    calculer();
  });
  el("reinitialiser").addEventListener("click", reinitialiser);
  el("imprimer").addEventListener("click", () => window.print());
  champSalaire.addEventListener("input", majEuros);

  majPeriode();
})();
