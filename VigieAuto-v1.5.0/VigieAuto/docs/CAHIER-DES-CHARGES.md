# Cahier des charges — VigieAuto

**État du produit : PWA 1.5.0 et Android 0.2.0 · Mise à jour : 31 octobre 2026**

Ce document distingue les besoins exprimés de ce qui fonctionne réellement. Il évolue avec les décisions de l’utilisateur ; une idée, une étude ou une demande ne doit pas être marquée « réalisée » avant son développement et ses vérifications.

**Légende :** ✅ réalisé dans la version indiquée · 🟠 demandé ou envisagé, à étudier/développer · ❓ décision ou priorité à préciser. Les sections 2 à 6 décrivent la **PWA 1.5.0** ; l’état distinct du projet **Android 0.2.0** est précisé en section 7.

## 1. Vision et contraintes

- Carnet de bord automobile gratuit, en français, simple sur téléphone, utilisable avec plusieurs véhicules et inspiré des fonctions de suivi de Drivvo, sans en reprendre le fonctionnement au détriment des besoins de l’utilisateur.
- Sans publicité ni abonnement, sans compte obligatoire dans VigieAuto. Données de l’application stockées localement sur l’appareil ; pas de télémétrie ni de synchronisation imposée.
- PWA installable et utilisable hors ligne **après une première visite et mise en cache**. Le stockage et le cache du navigateur peuvent être supprimés : une sauvegarde externe reste indispensable.
- Interface responsive et contrastée, lisible sur Android et les autres écrans compatibles. Projet statique HTML/CSS/JavaScript, IndexedDB, manifest et service worker ; ces technologies peuvent évoluer si l’utilisateur approuve une évolution d’architecture.
- Pour la base, pas de GPS ni d’OBD imposés. Le GPS des trajets est désormais facultatif et local ; une éventuelle copie cloud personnelle reste envisagée, non réalisée et ne doit pas devenir obligatoire.

## 2. Identité, apparence et navigation

| Exigence | État et critères actuels |
|---|---|
| Nom **VigieAuto** et logo bouclier + voiture + coche fourni par l’utilisateur | ✅ Image originale conservée dans `assets/logo-original.png`, icône PNG redimensionnée ; logo SVG retracé qui suit la couleur du thème. L’OS peut adapter l’icône sur l’écran d’accueil. |
| Sauge clair/sombre et Cyan clair/sombre selon le téléphone | ✅ Sélection et changement système en direct ; préférence locale et présente dans les sauvegardes réelles. Cyan conserve une carte véhicule sombre. |
| Ancien mode mixte | ✅ « Automatique (mixte) » : Sauge clair / Cyan sombre, pour compatibilité. |
| Cinq onglets mobiles | ✅ Accueil, Entretien, Pleins, Trajets, Réglages. Les contrôles **CQ** restent accessibles directement en haut ; le **+** central donne les ajouts rapides et « … » les autres rubriques. |
| Accueil pratique | ✅ Véhicule actif, rappels fondés sur les données, contrôle suggéré et bouton de trajet manuel. Les exemples sont identifiés comme fictifs. |
| Retours de design | ✅ Proposition 1 écartée ; présentation de 2 retenue avec les palettes Sauge/Cyan appréciées. Les propositions devenues inutiles sont supprimées, pas le code actuel. |

## 3. Fonctions du carnet

| Domaine | Exigences et état |
|---|---|
| Véhicules | ✅ Créer, modifier, sélectionner et supprimer plusieurs véhicules ; identité, énergie, kilométrage, photo et notes. Supprimer un véhicule supprime ses données associées. |
| Suggestions véhicule | ✅ Référentiel commun v1 hors ligne : 48 marques, 432 modèles et 7 énergies. Recherche sans casse/accents, modèles par marque, saisie libre, « Autre… », mémoire locale et derniers choix ; jamais de générations imposées. Année facultative, kilométrage obligatoire. Exemple Clio proposé explicitement sans kilométrage inventé. |
| Entretien | ✅ Ajouter et modifier interventions, dates, kilométrages, coûts et échéances facultatives ; rappels définis par la personne selon le constructeur. |
| Pleins et consommation | ✅ Historique carburant/recharges ; calcul entre pleins complets incluant les pleins partiels et excluant les intervalles incohérents. Litres et kWh ne sont pas mélangés. Les recharges électriques nécessitent deux charges complètes cohérentes ; suivi séparé de l’hybride rechargeable non implémenté. |
| Dépenses et statistiques | ✅ Coûts saisis, totaux et historique. Coût énergétique moyen au kilomètre issu des intervalles valides ; les chiffres ne garantissent pas le coût complet de possession. |
| Rappels | ✅ Échéances par date et/ou kilométrage, récurrence et affichage dans l’application. ❌ Pas de notification garantie lorsque l’application est fermée. |
| Contrôles qualité | ✅ Six listes de départ, listes personnalisables, exécution et historique ; accès CQ direct. |
| Symptômes | ✅ Journal d’observations et informations de prudence. ❌ Pas de diagnostic automatisé ; en cas de doute de sécurité, consulter un professionnel. |
| Documents | ✅ Images et PDF stockés localement, 5 Mo maximum par fichier, inclus dans les sauvegardes. ❌ Rattachement à une intervention précise non réalisé. |
| Export/import | ✅ Export JSON complet non chiffré, import validé et confirmé qui remplace atomiquement les données. Les sauvegardes CQ Auto compatibles sont acceptées. |

## 4. Module Trajets

### Disponible actuellement

- ✅ Trajet saisi après coup ou chronomètre démarré et terminé manuellement ; date et distance saisie, durée modifiable, nom, départ, arrivée et notes facultatifs.
- ✅ Historique et filtre par type pour le véhicule ; un chronomètre en cours reste associé au véhicule de départ et peut être retrouvé après rechargement.
- ✅ Trois types **déclarés** par l’utilisateur : trafic haché, roulant, croisière. Ils ne mesurent pas une grandeur mécanique.
- ✅ Estimation indicative du coût énergétique du trajet si les pleins fournissent une moyenne cohérente. Ce n’est pas une consommation mesurée et l’estimation peut évoluer avec l’historique des pleins.
- ✅ GPS de premier plan **facultatif** : explication, choix et autorisation ; estimation de la distance, arrêt/pause, correction manuelle à la fin et signalement des interruptions détectées. La page masquée ne mesure pas ; la reprise après fermeture/rechargement/import demande une action à l’arrêt.
- ✅ Les coordonnées et la trace GPS ne sont pas enregistrées automatiquement : seul un résumé est conservé. Les textes de départ/arrivée ajoutés par l’utilisateur peuvent naturellement contenir des informations personnelles.
- ⚠️ Distance et durée approximatives, suivi continu écran éteint/application fermée non garanti ; l’obtention d’une position sans Internet dépend du téléphone. Ne pas utiliser le téléphone en conduisant.
- ❌ Bluetooth et NFC ne sont pas activés dans la version actuelle.

### Demandé ou proposé pour la suite

- 🟠 Tester le GPS sur le téléphone réel : précision, interruptions, consommation de batterie, signal et permission. Ajuster les filtres si nécessaire ; les catégories de mouvement automatiques ne sont pas réalisées.
- 🟠 Déclenchement par Bluetooth associé au véhicule ou badge NFC, pour éviter les trajets attribués au mauvais véhicule. Étudier la faisabilité réelle et le recours manuel : **un déclenchement silencieux universel ne peut pas être promis en PWA**.
- 🟠 Statistiques et filtres étendus, trajets récurrents et questions facultatives adaptées au véhicule sur la charge, la climatisation ou une opération déclarée.
- ❓ Score éco : souhait non arbitré. S’il est retenu, définir une méthode transparente et testée ; ne pas présenter un score comme un diagnostic.
- ❓ Fréquence des questions à l’arrivée et ordre de réalisation à préciser. Le choix initial est de conserver uniquement un résumé ; toute trace précise exigerait un nouveau choix explicite.

Les limites de faisabilité sont détaillées dans `plan-trajets.md`. Le GPS seul ne détermine ni l’état des injecteurs/EGR, ni la consommation réelle d’un trajet, ni la cause d’une panne.

## 5. Sauvegardes et confidentialité

- ✅ Sauvegarde JSON manuelle et restauration après confirmation ; le JSON n’est pas chiffré. Garder régulièrement une copie dans un emplacement sûr **hors du téléphone** et vérifier sa restauration.
- 🟠 Rappel de sauvegarde dans l’application, éventuellement après 30 jours, proposé mais non réalisé. Un téléchargement démarré ne prouve pas qu’une copie externe est disponible.
- 🟠 Sauvegarde automatique dans un dossier choisi et/ou Google Drive personnel demandée. À étudier séparément : permissions, réussite/échec visibles, compatibilité, accès éventuellement redemandé, copie manuelle de secours et confidentialité. Une option Drive nécessite une connexion et les autorisations du service ; elle ne serait pas 100 % locale/hors ligne et doit rester facultative.
- 🟠 PDF d’entretien proposé ; il ne remplacerait pas une sauvegarde JSON complète et restaurable.
- ❌ Aucune sauvegarde automatique ni synchronisation Drive n’est actuellement opérationnelle.

## 6. Compatibilité, fiabilité et tests

- ✅ La base IndexedDB conserve son nom interne historique ; migration vers sa version 2 avec collection `trips`. Le manifest conserve son identité et sa portée pour la mise à jour sur la même origine.
- ✅ Les sauvegardes CQ Auto/VigieAuto au format 1 et VigieAuto au format 2 sont importables ; VigieAuto exporte au format 3. Les anciennes versions ne savent pas forcément lire la nouvelle base ou les nouvelles sauvegardes : sauvegarder avant migration et ne pas effacer le stockage pour forcer une mise à jour.
- ✅ Tests automatisés : calculs GPS et métier ; thèmes ; navigation et formulaires ; trajets, plusieurs véhicules, permissions/interruptions GPS simulées ; imports/exports, données invalides, suppression et hors-ligne. Migrations réelles depuis les ZIP 1.3.2 et 1.4.0 et sous-dossier testées dans Chromium automatisé ; formulaire et coupure serveur aussi testés avec WebKit automatisé (pas sur un iPhone réel) ; l’API Geolocation de Chromium est aussi exercée avec une position émulée.
- ✅ L’utilisateur indique avoir effectué l’installation/publication Android. Les détails des essais ne sont pas rapportés ici. 🟠 La version 1.5.0 et son GPS restent à publier au même emplacement puis à tester sur son téléphone réel ; l’aperçu de la conversation n’est pas un hébergement permanent.
- ❌ La PWA ne comprend ni OBD, OCR, carte des stations, import Drivvo, synchronisation multi-appareils ou diagnostic automatique. L’APK de contrôle du socle Android est distinct et n’est pas une version de publication.

## 7. Deux branches : Android natif et PWA familiale

- ✅ L’utilisateur retient **Kotlin + Jetpack Compose pour Android** et conserve la PWA pour le carnet familial sur iPhone. Ses projets Santé et LIFTQ sont décrits comme références ; leurs sources n’ont pas été auditées ici.
- ✅ Android 0.2.0 ajoute la création et la sélection de véhicules, les suggestions libres via Compose et une table Room `suggestions_perso` migrée sans suppression. Navigation, thèmes, import/export et consultation partielle demeurent. Ce n’est pas le carnet complet ; la PWA 1.5.0 reste distincte et ne partage pas automatiquement sa base.
- ❓ Identifiant utilisé pour le développement : `com.vigieauto.app`, **provisoire et non confirmé**. Le fixer avant installation pérenne ; changer de package crée une autre application. La signature de debug dépend de l’ordinateur ; une signature de production reste à définir.
- 🟠 Toute migration doit préserver les principes existants : gratuité, usage local et hors ligne, sans publicité ni compte obligatoire, GPS facultatif et pas de trace GPS conservée par défaut, export/import et sauvegarde externe.
- ✅ Import des exports PWA formats 1, 2 et 3, conservation des photos, documents et champs supplémentaires et export format 3, testés sur des données fictives. Import après confirmation et transaction, avec des limites documentées ; aucune fusion ni synchronisation. 🟠 Conserver la PWA et une sauvegarde vérifiée jusqu’à validation réelle sur téléphone.
- 🟠 La modification/suppression de véhicules, les saisies Android des autres rubriques, le GPS natif, Bluetooth/NFC et rappels système relèvent des lots suivants. Permissions explicites, notification de service GPS si nécessaire, restrictions Android et essais réels ; pas de garantie de démarrage silencieux ou d’alarme exacte universelle.
- ❌ Pas de chiffrement SQLCipher ou des exports dans Android 0.2.0 ; stockage local ne dispense pas d’une sauvegarde externe. Pas de GPS, Bluetooth ou NFC implémenté dans le socle Android.
- ⚠️ L’adresse publique copiée dans le message renvoie 404 depuis notre accès ; l’état réel de l’installation et de son cache n’est pas établi. Ne pas effacer les données ni désinstaller sans export vérifié ; une PWA accessible en HTTPS doit être testée sur les iPhone réels.

## 8. Documents et gestion du workspace

- `HISTORIQUE.md` : journal daté des demandes, décisions, réalisations, corrections, tests et limites.
- `CAHIER-DES-CHARGES.md` : besoins et statut réel de chaque exigence.
- `FEUILLE-DE-ROUTE.md` : étapes réalisées, suites proposées et arbitrages ; aucune date non validée n’est présentée comme un engagement.
- `plan-trajets.md` : annexe technique encore utile pour les trajets et sauvegardes envisagés ; `INSTALLER.md` à la racine : guide d’installation.
- Après chaque évolution : mettre à jour les trois documents, supprimer les fichiers temporaires/anciennes propositions inutiles et conserver les **trois derniers ZIP versionnés de versions distinctes**. Ne pas supprimer les données de l’utilisateur, les sauvegardes personnelles ou les sources nécessaires.
- Le dossier de travail est conservé sous `cq-auto` pour préserver les liens et l’aperçu ; l’application et son archive portent le nom VigieAuto.
