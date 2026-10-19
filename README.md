# Calculette pouvoir d'achat — Syndicat CFTC Fédération Banques

Site web statique permettant aux adhérents de comparer leurs taux d'augmentation
**collective** et **individuelle** cumulés au **taux d'inflation cumulé** (source INSEE)
depuis leur année d'arrivée dans l'entreprise.

Version web de la calculette Excel `Calculette_pouvoir_dachat_CFTC_BPCE.xlsm` :
même charte graphique (bleu CFTC `#0F3F93`, cellules de saisie bleues `#7AB0D9`),
mêmes fonctionnalités (choix de l'année d'arrivée, saisie année par année,
boutons *Calculer* et *Réinitialiser*, message de hausse ou de baisse du pouvoir d'achat).

En plus de l'Excel : inflation INSEE depuis 1991, graphique d'évolution, traduction
facultative de l'écart en euros (par an et par mois), mémorisation locale des saisies,
partage du lien, impression / PDF, affichage adapté au mobile. Tous les calculs se font
dans le navigateur ; aucune donnée n'est transmise.

## Calcul

- Augmentation cumulée = Π (1 + taux collectif) × (1 + taux individuel) − 1
- Inflation cumulée = Π (1 + inflation annuelle INSEE) − 1
- Écart de pouvoir d'achat = (1 + augmentation cumulée) ÷ (1 + inflation cumulée) − 1

sur toutes les années, de l'année d'arrivée (incluse) à la dernière année disponible.

L'écart est un **rapport**, pas une soustraction : c'est ce que la rémunération permet
d'acheter aujourd'hui par rapport à l'année d'arrivée. La soustraction des deux cumuls
(utilisée dans le classeur Excel) en est une approximation qui exagère légèrement l'écart
— par exemple +14,94 % d'augmentation face à +20,79 % d'inflation donne −4,84 % de pouvoir
d'achat, et non −5,85 points.

## Données

`js/donnees-insee.js` contient les taux d'inflation annuels moyens (IPC, ensemble des
ménages, France, ensemble) de **1991 à 2025**, issus des séries INSEE
[001764363](https://www.insee.fr/fr/statistiques/serie/001764363) (indice annuel) et
001759970 (indice mensuel).

**Mettre à jour l'inflation** : ajouter une ligne `2026: x.x,` (moyenne annuelle de l'IPC
publiée par l'INSEE en janvier). Le tableau, la liste des années et les calculs s'adaptent
automatiquement.

## Vie privée

Les saisies sont conservées dans le `localStorage` du navigateur de l'utilisateur, afin
qu'il les retrouve à sa prochaine visite. Elles ne quittent jamais son appareil, et le
bouton *Réinitialiser* les efface.

## Mise en ligne

Aucune compilation nécessaire : il suffit d'héberger les fichiers tels quels
(GitHub Pages : *Settings → Pages → Deploy from a branch*, branche `main`, dossier racine).
Pour tester en local, ouvrir `index.html` dans un navigateur.
