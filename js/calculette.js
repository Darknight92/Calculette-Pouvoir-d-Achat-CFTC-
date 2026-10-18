/*
 * Calculette pouvoir d'achat CFTC BPCE
 * Reprend la logique de la macro « Calculer » du classeur Excel :
 *   augmentation cumulée = Π (1 + collective) × (1 + individuelle) − 1
 *   inflation cumulée    = Π (1 + inflation) − 1
 *   écart                = ce que la rémunération achète aujourd'hui par rapport à l'arrivée
 * sur les années allant de l'année d'arrivée à la dernière année connue.
 */
(function () {
  "use strict";

  const ANNEES = Object.keys(INFLATION_INSEE).map(Number).sort((a, b) => a - b);
  const PREMIERE_ANNEE = ANNEES[0];
  const DERNIERE_ANNEE = ANNEES[ANNEES.length - 1];
  const CLE_MEMOIRE = "cftc-bpce-pouvoir-achat-v1";
  const TAUX_MAX = 100; // garde-fou de saisie, en points de pourcentage

  const formatPct = new Intl.NumberFormat("fr-FR", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formatPctSigne = new Intl.NumberFormat("fr-FR", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: "exceptZero",
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

  // --- Mémorisation locale (navigateur uniquement) ----------------------

  function lireMemoire() {
    try {
      return JSON.parse(localStorage.getItem(CLE_MEMOIRE)) || {};
    } catch (e) {
      return {};
    }
  }

  function enregistrerMemoire() {
    const saisies = {};
    lignes.querySelectorAll("input").forEach((input) => {
      if (input.value.trim() !== "") saisies[input.id] = input.value;
    });
    try {
      localStorage.setItem(
        CLE_MEMOIRE,
        JSON.stringify({ annee: selectAnnee.value, saisies, salaire: champSalaire.value })
      );
    } catch (e) {
      /* navigation privée ou stockage plein : on continue sans mémoriser */
    }
  }

  function oublierMemoire() {
    try {
      localStorage.removeItem(CLE_MEMOIRE);
    } catch (e) {
      /* rien à faire */
    }
  }

  // --- Construction de l'interface -------------------------------------

  const cellule = (type, annee, libelle) =>
    '<td data-libelle="' + libelle + '"><span class="champ">' +
    '<input type="text" inputmode="decimal" autocomplete="off" size="6" id="' + type + "-" + annee + '" ' +
    'aria-label="' + libelle + " " + annee + ' en %" placeholder="0,00"></span></td>';

  ANNEES.forEach((annee) => {
    const option = document.createElement("option");
    option.value = annee;
    option.textContent = annee;
    selectAnnee.appendChild(option);

    const tr = document.createElement("tr");
    tr.dataset.annee = annee;
    tr.innerHTML =
      '<td class="annee" data-libelle="Année">' + annee + "</td>" +
      cellule("coll", annee, "Taux d'augmentation collective") +
      cellule("indiv", annee, "Taux d'augmentation individuelle") +
      '<td class="inflation" data-libelle="Inflation INSEE">' +
      formatPct.format(INFLATION_INSEE[annee] / 100) +
      "</td>";
    lignes.appendChild(tr);
  });

  el("annee-courante").textContent = new Date().getFullYear();
  el("annee-min").textContent = PREMIERE_ANNEE;
  el("annee-max").textContent = DERNIERE_ANNEE;

  // Année proposée par défaut : les dix dernières années, sauf choix mémorisé.
  const anneeParDefaut = Math.max(PREMIERE_ANNEE, DERNIERE_ANNEE - 9);
  const memoire = lireMemoire();
  selectAnnee.value = ANNEES.includes(Number(memoire.annee))
    ? String(memoire.annee)
    : String(anneeParDefaut);
  if (memoire.saisies) {
    Object.keys(memoire.saisies).forEach((id) => {
      const input = el(id);
      if (input) input.value = memoire.saisies[id];
    });
  }
  if (memoire.salaire) champSalaire.value = memoire.salaire;

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
    const nombre = Number(texte);
    if (nombre < -TAUX_MAX || nombre > TAUX_MAX) return NaN;
    return nombre / 100;
  }

  function lireSaisies(depuis) {
    const invalides = [];
    const parAnnee = {};
    anneesPeriode(depuis).forEach((a) => {
      const coll = el("coll-" + a);
      const indiv = el("indiv-" + a);
      const tc = lireTaux(coll.value);
      const ti = lireTaux(indiv.value);
      coll.setAttribute("aria-invalid", Number.isNaN(tc));
      indiv.setAttribute("aria-invalid", Number.isNaN(ti));
      if (Number.isNaN(tc)) invalides.push({ input: coll, annee: a });
      if (Number.isNaN(ti)) invalides.push({ input: indiv, annee: a });
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
    const nb = anneesPeriode(depuis).length;
    el("alerte-sans-augmentation").textContent =
      "Sans aucune augmentation depuis " + depuis + " (" + nb + " année" + (nb > 1 ? "s" : "") +
      "), votre pouvoir d'achat a baissé de " + formatPct.format(inflationCumulee(depuis));
  }

  function calculer() {
    const depuis = Number(selectAnnee.value);
    const { invalides, parAnnee } = lireSaisies(depuis);

    if (invalides.length) {
      const anneesKo = [...new Set(invalides.map((i) => i.annee))];
      erreur.textContent =
        "Saisie à corriger " + (anneesKo.length > 1 ? "pour les années " : "pour l'année ") +
        anneesKo.join(", ") + " : indiquez uniquement un nombre compris entre -" + TAUX_MAX +
        " et " + TAUX_MAX + " (ex. 1,5), ou laissez la case vide.";
      erreur.hidden = false;
      resultats.hidden = true;
      invalides[0].input.focus();
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
    // Écart réel de pouvoir d'achat : ce que la rémunération achète aujourd'hui
    // par rapport à l'année d'arrivée.
    const ecart = indiceSalaire / indicePrix - 1;

    el("res-augmentation").textContent = formatPct.format(augmentation);
    el("res-inflation").textContent = formatPct.format(inflation);
    el("res-ecart").textContent = formatPctSigne.format(ecart);
    el("carte-ecart").classList.toggle("carte--baisse", ecart < 0);
    el("carte-ecart").classList.toggle("carte--hausse", ecart >= 0);

    const message = el("message");
    message.textContent =
      "Depuis " + depuis + ", votre pouvoir d'achat a " + (ecart < 0 ? "baissé" : "augmenté") +
      " de " + formatPct.format(Math.abs(ecart));
    message.className = "message " + (ecart < 0 ? "message--baisse" : "message--hausse");

    dernierResultat = { depuis, indiceSalaire, indicePrix };
    majEuros();
    dessinerGraphique(points);
    enregistrerMemoire();

    resultats.hidden = false;
    const doux = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultats.scrollIntoView({ behavior: doux ? "smooth" : "auto", block: "start" });
  }

  function majEuros() {
    const zone = el("message-euros");
    const salaire = Number(champSalaire.value.replace(/[\s €]/g, "").replace(",", "."));
    if (!dernierResultat || !salaire || salaire <= 0) {
      zone.hidden = true;
      return;
    }
    // Salaire qui aurait exactement suivi l'inflation depuis l'arrivée
    const { depuis, indiceSalaire, indicePrix } = dernierResultat;
    const salaireCible = (salaire / indiceSalaire) * indicePrix;
    const difference = salaire - salaireCible;
    zone.textContent =
      difference < 0
        ? "Pour retrouver votre pouvoir d'achat de " + depuis + ", il vous manque environ " +
          formatEuro.format(-difference) + " brut par an, soit " +
          formatEuro.format(-difference / 12) + " par mois (salaire cible : " +
          formatEuro.format(salaireCible) + ")."
        : "Votre salaire dépasse d'environ " + formatEuro.format(difference) + " brut par an (" +
          formatEuro.format(difference / 12) + " par mois) le niveau qui aurait simplement suivi " +
          "l'inflation depuis " + depuis + ".";
    zone.hidden = false;
  }

  function reinitialiser() {
    lignes.querySelectorAll("input").forEach((input) => {
      input.value = "";
      input.removeAttribute("aria-invalid");
    });
    selectAnnee.value = String(anneeParDefaut);
    champSalaire.value = "";
    erreur.hidden = true;
    resultats.hidden = true;
    dernierResultat = null;
    oublierMemoire();
    majPeriode();
    selectAnnee.focus();
  }

  // --- Graphique SVG ----------------------------------------------------

  // Choisit un pas de graduation « rond » proche de l'amplitude affichée.
  function pasGraduation(amplitude) {
    const brut = amplitude / 5;
    const puissance = Math.pow(10, Math.floor(Math.log10(brut)));
    return [1, 2, 2.5, 5, 10].map((m) => m * puissance).find((p) => p >= brut) || puissance * 10;
  }

  function dessinerGraphique(points) {
    const L = 680;
    const H = 280;
    const m = { haut: 18, droite: 58, bas: 30, gauche: 46 };
    const valeurs = points.flatMap((p) => [p.salaire, p.prix]);
    const pas = pasGraduation(Math.max(Math.max(...valeurs) - Math.min(...valeurs), 10));
    const min = Math.floor(Math.min(...valeurs) / pas) * pas;
    const max = Math.ceil(Math.max(...valeurs) / pas) * pas;

    const x = (i) => m.gauche + (i * (L - m.gauche - m.droite)) / Math.max(points.length - 1, 1);
    const y = (v) => H - m.bas - ((v - min) * (H - m.haut - m.bas)) / (max - min || 1);
    const chemin = (cle) =>
      points.map((p, i) => (i ? "L" : "M") + x(i).toFixed(1) + "," + y(p[cle]).toFixed(1)).join(" ");

    let grille = "";
    for (let v = min; v <= max + 0.0001; v += pas) {
      const yv = y(v).toFixed(1);
      grille +=
        '<line x1="' + m.gauche + '" x2="' + (L - m.droite) + '" y1="' + yv + '" y2="' + yv +
        '" stroke="#e3e7ee"/>' +
        '<text x="' + (m.gauche - 8) + '" y="' + (Number(yv) + 4).toFixed(1) + '" text-anchor="end">' +
        Math.round(v * 10) / 10 + "</text>";
    }

    // Une étiquette d'année sur N pour rester lisible sur les longues périodes
    const saut = Math.ceil(points.length / 9);
    const etiquettes = points
      .map((p, i) =>
        i % saut === 0 || i === points.length - 1
          ? '<text x="' + x(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + p.annee + "</text>"
          : ""
      )
      .join("");

    // Aire entre les deux courbes : verte si la rémunération est devant, rouge sinon
    const dernier = points.length - 1;
    const enRetard = points[dernier].salaire < points[dernier].prix;
    const retour = points
      .map((p, i) => "L" + x(dernier - i).toFixed(1) + "," + y(points[dernier - i].prix).toFixed(1))
      .join(" ");
    const aire =
      '<path d="' + chemin("salaire") + " " + retour + ' Z" fill="' +
      (enRetard ? "#d50000" : "#1b7f3b") + '" opacity="0.1"/>';

    // Valeurs de fin, écartées si les deux courbes se rejoignent
    let ySalaire = y(points[dernier].salaire);
    let yPrix = y(points[dernier].prix);
    if (Math.abs(ySalaire - yPrix) < 14) {
      const sens = ySalaire <= yPrix ? -1 : 1;
      ySalaire += sens * 7;
      yPrix -= sens * 7;
    }
    const xFin = (x(dernier) + 9).toFixed(1);
    const fin =
      '<circle cx="' + x(dernier).toFixed(1) + '" cy="' + y(points[dernier].salaire).toFixed(1) +
      '" r="4" fill="#0f3f93"/>' +
      '<circle cx="' + x(dernier).toFixed(1) + '" cy="' + y(points[dernier].prix).toFixed(1) +
      '" r="4" fill="#d50000"/>' +
      '<text class="valeur-fin" x="' + xFin + '" y="' + (ySalaire + 4).toFixed(1) + '" fill="#0f3f93">' +
      Math.round(points[dernier].salaire) + "</text>" +
      '<text class="valeur-fin" x="' + xFin + '" y="' + (yPrix + 4).toFixed(1) + '" fill="#d50000">' +
      Math.round(points[dernier].prix) + "</text>";

    const resume =
      "Base 100 en " + points[0].annee + ". En " + points[dernier].annee +
      ", votre rémunération atteint " + Math.round(points[dernier].salaire) +
      " et les prix " + Math.round(points[dernier].prix) + ".";

    el("graphique").innerHTML =
      '<svg viewBox="0 0 ' + L + " " + H + '" role="img" ' +
      'aria-label="Évolution de votre rémunération comparée à celle des prix. ' + resume + '">' +
      "<desc>" + resume + "</desc>" +
      grille + etiquettes + aire +
      '<path d="' + chemin("prix") + '" fill="none" stroke="#d50000" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="' + chemin("salaire") + '" fill="none" stroke="#0f3f93" stroke-width="2.5" stroke-linejoin="round"/>' +
      fin + "</svg>";
  }

  // --- Partage ----------------------------------------------------------

  function partager() {
    const info = el("partage-ok");
    const effacer = () => setTimeout(() => (info.textContent = ""), 4000);
    const donnees = {
      title: document.title,
      text: "Vos augmentations ont-elles suivi l'inflation ? Faites le calcul.",
      url: location.href,
    };
    if (navigator.share) {
      navigator.share(donnees).catch(() => {});
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(location.href).then(
        () => {
          info.textContent = "Lien copié !";
          effacer();
        },
        () => {
          info.textContent = location.href;
          effacer();
        }
      );
      return;
    }
    info.textContent = location.href;
    effacer();
  }

  // --- Évènements -------------------------------------------------------

  selectAnnee.addEventListener("change", () => {
    majPeriode();
    resultats.hidden = true;
    dernierResultat = null;
    enregistrerMemoire();
  });
  formulaire.addEventListener("submit", (e) => {
    e.preventDefault();
    calculer();
  });
  lignes.addEventListener("input", enregistrerMemoire);
  el("reinitialiser").addEventListener("click", reinitialiser);
  el("imprimer").addEventListener("click", () => window.print());
  el("partager").addEventListener("click", partager);
  champSalaire.addEventListener("input", () => {
    majEuros();
    enregistrerMemoire();
  });

  majPeriode();
})();
