# Calculette pouvoir d'achat — CFTC BPCE

Site web statique permettant aux adhérents de comparer leurs taux d'augmentation
**collective** et **individuelle** cumulés au **taux d'inflation cumulé** (source INSEE)
depuis leur année d'arrivée dans l'entreprise.

Version web de la calculette Excel `Calculette_pouvoir_dachat_CFTC_BPCE.xlsm` :
même charte graphique (bleu CFTC `#0F3F93`, cellules de saisie bleues `#7AB0D9`),
mêmes fonctionnalités (choix de l'année d'arrivée, saisie année par année,
boutons *Calculer* et *Réinitialiser*, message de hausse ou de baisse du pouvoir d'achat).

En plus de l'Excel : graphique d'évolution, traduction facultative de l'écart en euros,
impression / PDF, affichage mobile. Tous les calculs se font dans le navigateur ;
aucune donnée n'est transmise.

## Calcul

- Augmentation cumulée = Π (1 + taux collectif) × (1 + taux individuel) − 1
- Inflation cumulée = Π (1 + inflation annuelle INSEE) − 1
- Écart = augmentation cumulée − inflation cumulée

sur toutes les années, de l'année d'arrivée (incluse) à la dernière année disponible.

## Mettre à jour l'inflation

Modifier `js/donnees-insee.js` : ajouter une ligne `2026: x.x,` (moyenne annuelle de
l'IPC publiée par l'INSEE). Le tableau et la liste des années s'adaptent automatiquement.

## Mise en ligne

Aucune compilation nécessaire : il suffit d'héberger les fichiers tels quels
(GitHub Pages : *Settings → Pages → Deploy from a branch*, dossier racine).
Pour tester en local, ouvrir `index.html` dans un navigateur.
