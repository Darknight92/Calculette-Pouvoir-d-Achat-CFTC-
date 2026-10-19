/*
 * Taux d'inflation annuels — source INSEE
 * Indice des prix à la consommation (IPC), ensemble des ménages, France,
 * ensemble (tabac compris), évolution en moyenne annuelle, en %.
 *
 * Séries de référence (base de données macro-économiques de l'INSEE) :
 *   - indice annuel  : idbank 001764363
 *   - indice mensuel : idbank 001759970
 * https://www.insee.fr/fr/statistiques/serie/001764363
 *
 * Les taux 2013-2025 sont le rapport des indices annuels publiés par l'INSEE ;
 * ceux de 2000 à 2012 sont calculés à partir des moyennes des indices mensuels
 * (les indices annuels de ces années-là ne sont publiés qu'à une décimale).
 *
 * Mise à jour : ajouter une ligne pour la nouvelle année (en %).
 * Le tableau, la liste des années et les calculs s'adaptent automatiquement.
 */
const INFLATION_INSEE = {
  2000: 1.7,
  2001: 1.6,
  2002: 1.9,
  2003: 2.1,
  2004: 2.1,
  2005: 1.7,
  2006: 1.7,
  2007: 1.5,
  2008: 2.8,
  2009: 0.1,
  2010: 1.5,
  2011: 2.1,
  2012: 2.0,
  2013: 0.9,
  2014: 0.5,
  2015: 0.0,
  2016: 0.2,
  2017: 1.0,
  2018: 1.8,
  2019: 1.1,
  2020: 0.5,
  2021: 1.6,
  2022: 5.2,
  2023: 4.9,
  2024: 2.0,
  2025: 0.9,
};
