# VigieAuto — carnet de bord automobile

VigieAuto est la suite de CQ Auto : une application web installable (PWA), version 1.5.0, en français, sans publicité ni compte utilisateur. Les informations saisies sont enregistrées localement dans le navigateur de l’appareil. Le projet utilise HTML, CSS, JavaScript et IndexedDB, sans bibliothèque ni serveur applicatif à l’exécution.

Pour savoir quoi faire du ZIP et installer la PWA sur Android, consultez [INSTALLER.md](INSTALLER.md).

### Documents de suivi du projet

- [Historique des demandes, décisions, réalisations et corrections](docs/HISTORIQUE.md)
- [Cahier des charges et état réel des fonctions](docs/CAHIER-DES-CHARGES.md)
- [Feuille de route et étapes à décider](docs/FEUILLE-DE-ROUTE.md)
- [Annexe technique : trajets et sauvegardes envisagés](docs/plan-trajets.md)

Ces documents sont à mettre à jour à chaque évolution. Conserver le dossier de code et les trois derniers ZIP de versions distinctes ; supprimer les anciens aperçus et fichiers de travail devenus inutiles sans effacer les données personnelles.

Pour préparer une nouvelle archive après avoir actualisé la version et exécuté les tests, utiliser Python 3.10 ou ultérieur :

```bash
python3 scripts/creer-archive.py --dry-run  # aperçu sans rien modifier
python3 scripts/creer-archive.py            # crée et vérifie le ZIP, puis garde trois versions
```

Le script n’écrase pas une archive existante ; il conserve les ZIP inconnus et les sauvegardes personnelles. Un alias historique n’est supprimé que s’il est identique à une archive connue. En cas de deux archives différentes d’une même version, il conserve les deux et signale le conflit à vérifier manuellement.

## Commencer

1. Ouvrez l’application. Le véhicule présenté est **fictif** : en mode découverte, les modifications du carnet d’exemple ne sont pas conservées après rechargement. La préférence de thème, elle, est enregistrée sur l’appareil, même dans ce mode.
2. Choisissez **« Commencer avec mon véhicule »** pour quitter ce mode et ajouter votre véhicule.
3. Sur téléphone, les cinq onglets sont **Accueil, Entretien, Pleins, Trajets et Réglages**. Le bouton **CQ** en haut ouvre directement les contrôles qualité. Le **+** central ouvre les ajouts rapides et le bouton **« … »** les autres rubriques.
4. Ajoutez vos informations. Le kilométrage du véhicule est mis à jour quand une entrée d’entretien ou de plein contient une valeur supérieure ; les trajets ne modifient pas automatiquement le compteur.
5. Dans **Paramètres → Exporter mes données**, téléchargez régulièrement une sauvegarde. Conservez-la dans un endroit sûr.

### Choisir l’apparence

Dans **Paramètres → Thème de l’application** :

- **Sauge** : une palette verte, en version claire ou sombre selon le réglage du téléphone.
- **Cyan** : une palette cyan, en version claire ou sombre selon le réglage du téléphone. La carte véhicule reste sombre dans les deux cas.
- **Automatique (mixte)** : Sauge lorsque le téléphone est en mode clair et Cyan lorsque le téléphone est en mode sombre. Ce choix conserve le comportement de la version précédente et reste celui par défaut si aucune préférence n’est enregistrée.

Les trois choix suivent le mode clair/sombre du téléphone en direct tant que l’application est ouverte. Sauge et Cyan restent dans leur palette respective lors du changement.

La préférence est enregistrée localement dans IndexedDB. Elle est incluse dans les exports de données réelles et restaurée à l’import. Une sauvegarde plus ancienne sans préférence de thème reste compatible : elle utilise alors **Automatique**. Un effacement complet rétablit ce choix par défaut.

### Fonctions de cette version

- Deux thèmes (Sauge et Cyan), chacun en clair ou sombre selon le téléphone ; navigation mobile avec ajout rapide et logo adaptatif.
- Plusieurs véhicules, avec changement de véhicule et suppression de leurs données associées. Marques et modèles recherchables, suggérés par marque, toujours libres et mémorisés localement après validation ; derniers choix repris. Un exemple Renault Clio 2008 est proposé sans création automatique ni kilométrage inventé.
- Référentiel français commun avec Android (48 marques et 432 modèles) ; hybride rechargeable et énergie libre conservées tout en restant compatibles avec les anciens codes d’énergie.
- Trajets **manuels** : chronomètre démarré et terminé par l’utilisateur, ou trajet ajouté après coup ; distance et profil saisis, historique et coût énergétique indicatif fondé sur les pleins valides.
- Trajets **GPS facultatifs** : depuis Trajets, choisissez « Avec GPS » et confirmez avant la demande d’autorisation. L’app estime la distance pendant que la page est visible ; elle enregistre le total et les interruptions, **sans stocker automatiquement les coordonnées ni une trace de l’itinéraire**. À l’arrêt, terminez le trajet et vérifiez/corrigez la distance proposée. La mesure peut être incomplète ou imprécise ; le mode manuel reste disponible.
- Entretiens, pleins ou recharges, autres dépenses et rappels par date et/ou kilométrage.
- Six listes de contrôle préchargées, listes personnalisables, exécution et historique.
- Journal de symptômes, documents locaux (images ou PDF de 5 Mo maximum par fichier), statistiques et graphique des six derniers mois.
- Export et import JSON de l’ensemble des données, y compris les photos, documents et listes personnalisées.
- Fonctionnement hors ligne après une première visite complète et la mise en cache de l’application.

## Points importants

- **Sauvegardez régulièrement.** La perte de l’appareil, l’effacement des données du navigateur ou une suppression par le système peuvent effacer le stockage local. Il n’y a aucune sauvegarde automatique ni synchronisation. L’export JSON contient des données personnelles **non chiffrées** ; ne le partagez pas sans précaution.
- L’import accepte les sauvegardes compatibles VigieAuto et les anciennes sauvegardes CQ Auto (qui ne contenaient pas de trajets), et **remplace** les données existantes après confirmation. Il ne s’agit pas d’un import Drivvo. Le remplacement de la base est effectué dans une transaction IndexedDB.
- Les rappels sont vérifiés et affichés **dans l’application**, à son ouverture et lors de son utilisation. Il n’y a pas de notification lorsque l’application est fermée. La récurrence est recalculée à partir de la date et du kilométrage actuels lorsque l’on marque un rappel comme fait.
- Les intervalles d’entretien sont à renseigner selon le constructeur et l’usage ; aucune valeur universelle n’est imposée.
- La consommation est calculée entre deux pleins complets : les volumes des pleins partiels intermédiaires sont inclus. Il faut saisir tous les ravitaillements avec un kilométrage cohérent. La moyenne est pondérée par la distance. Pour les véhicules électriques, le calcul suppose deux charges à 100 % et tient compte de l’énergie rechargée, pertes comprises : il s’agit d’une estimation. Le suivi séparé des recharges d’une hybride rechargeable n’est pas encore proposé.
- Les dépenses affichées sont les **montants enregistrés**, pas un coût total de possession garanti. L’application n’est pas un outil de diagnostic : en cas de voyant rouge, d’odeur de carburant, de fumée anormale ou de doute sur la sécurité, arrêtez-vous en sécurité et consultez un professionnel.
- La position n’est demandée **qu’en choisissant le GPS** et après l’autorisation du navigateur. VigieAuto ne transmet pas les coordonnées à un service tiers et ne les enregistre pas ; le navigateur ou le système peut utiliser ses propres services de localisation. Une connexion n’est pas requise par l’app pour calculer la distance, mais l’obtention d’une position hors ligne dépend du matériel et des réglages du téléphone.
- Le suivi GPS s’arrête lorsque l’application est masquée ; il peut reprendre à son retour à l’écran dans la même session si une position avait été obtenue. Après fermeture, rechargement ou import d’un trajet en cours, reprenez explicitement le GPS à l’arrêt. Il n’y a pas de garantie de suivi écran éteint ou en arrière-plan ; les portions manquantes ne sont pas reconstruites et les interruptions détectées sont signalées. Le téléphone peut consommer plus de batterie.
- Pas de synchronisation cloud ou d’analyse publicitaire dans ce code. L’hébergeur choisi peut toutefois conserver ses propres journaux de connexion. Les données locales et les sauvegardes ne sont pas chiffrées par l’application. Ne manipulez pas le téléphone en conduisant.

## Lancer en local pour développer

Avec Python installé, dans le dossier du projet :

```bash
python3 -m http.server 8000
```

Puis ouvrez **http://localhost:8000/** sur le même ordinateur. `localhost` est un contexte sécurisé pour le développement. Une adresse HTTP du type `http://adresse-ip-de-l-ordinateur:8000` ouverte sur un téléphone n’est généralement **pas** considérée comme sécurisée : le service worker et l’installation hors ligne peuvent ne pas fonctionner. Pour un téléphone, utilisez une adresse HTTPS.

On ne peut pas installer correctement la PWA en ouvrant simplement `index.html` en `file://`.

## Publier en HTTPS

Les fichiers sont statiques ; aucun serveur applicatif n’est nécessaire. Un hébergement statique HTTPS tel que GitHub Pages ou Netlify convient, sous réserve des conditions et limites de son offre.

### Exemple avec GitHub Pages

1. Créez un dépôt GitHub et déposez **le contenu** du dossier `VigieAuto` à sa racine, notamment `index.html`, `sw.js`, `manifest.webmanifest` et les dossiers `js`, `css`, `data`, `assets` et `icons`.
2. Dans **Settings → Pages**, sélectionnez la publication depuis la branche et le dossier qui contiennent ces fichiers.
3. Une fois la publication terminée, ouvrez l’adresse HTTPS indiquée par GitHub Pages. Les chemins relatifs permettent de servir l’application dans un sous-dossier de type `/VigieAuto/`.
4. Laissez la première visite se terminer en ligne ; le service worker met en cache les ressources nécessaires. Vérifiez ensuite le fonctionnement hors ligne.

Un changement de domaine, de port, de navigateur ou d’appareil peut entraîner un stockage différent. **Exportez avant le changement, puis importez la sauvegarde dans la nouvelle installation.** L’aperçu fourni pendant le développement n’est pas un hébergement pérenne.

Pour mettre à jour une installation existante sur la **même adresse**, sauvegardez d’abord vos données, puis remplacez les fichiers de l’application par ceux de cette version. La base locale garde son ancien nom interne pour conserver les données ; une migration ajoute la collection des trajets sans supprimer les autres. Fermez les autres onglets de l’ancienne version avant la mise à jour. La sauvegarde est désormais au format 3 ; les formats VigieAuto 2 et CQ Auto 1 restent importables. Les anciennes versions ne savent pas nécessairement lire les nouvelles données ou sauvegardes : ne revenez pas en arrière sans précaution. Laissez l’application ouverte en ligne le temps que la nouvelle version soit mise en cache, puis rechargez-la. Si l’ancienne interface reste affichée, fermez et rouvrez l’application en ligne. Vérifiez **Réglages → en bas de page → version 1.5.0**. **Ne supprimez pas les données du navigateur pour forcer une mise à jour** : cela pourrait effacer votre carnet.

### Installer sur téléphone

- **Android :** ouvrez l’adresse HTTPS dans un navigateur compatible, puis utilisez son menu « Installer l’application » ou « Ajouter à l’écran d’accueil ».
- **iPhone :** ouvrez l’adresse HTTPS dans Safari, choisissez **Partager → Sur l’écran d’accueil**. Le stockage de l’application installée peut être séparé de celui de l’onglet Safari : vérifiez vos données et, si nécessaire, passez par l’export/import.

Les intitulés et possibilités exacts dépendent du navigateur et de sa version. Une première connexion est nécessaire ; l’installation et le cache ne garantissent pas à eux seuls la conservation des données.

## Tests et maintenance

Les calculs critiques disposent de tests sans dépendance. Avec Node.js 18 ou plus récent :

```bash
npm test
```

Des tests d’interface Playwright sont également fournis pour les thèmes, la navigation, les formulaires, l’import/export et le hors-ligne. Ils nécessitent les dépendances de développement et Chromium ; ils démarrent un serveur local de test :

```bash
npm install
npx playwright install chromium
npm run test:interface
npm run test:catalogue
npm run test:archive
# Facultatif : installer WebKit puis VIGIE_BROWSER=webkit npm run test:catalogue
# Test facultatif d’une mise à jour réelle à partir du ZIP précédent :
npm run test:migration -- /chemin/VigieAuto-v1.4.0.zip
```

Sur certains systèmes Linux, des bibliothèques système supplémentaires peuvent être nécessaires pour Chromium. Ces dépendances ne sont pas nécessaires à l’utilisation normale de l’application.

- `css/themes.css` : palettes, mode sombre et adaptation de l’interface.
- `js/calc.js` : dates, consommation, échéances et dépenses.
- `js/gps.js` : estimation et filtres GPS en mémoire, sans persistance des points.
- `data/brands_models_fr.json` et `js/catalogue.js` : référentiel partagé hors ligne, recherche et mémoire des suggestions.
- `js/db.js` : accès IndexedDB, migration CQ Auto → VigieAuto et transactions.
- `js/logo.js` et `assets/logo-vigieauto.svg` : vectorisation du logo fourni, adaptée au thème ; les icônes PNG dérivent de l’image fournie (`assets/logo-original.png`).
- `js/data.js` : catégories, listes par défaut et données fictives.
- `js/app.js` : écrans, formulaires, sauvegarde, suivi GPS et navigation ; `APP_VERSION` doit être mis à jour avec les autres versions.
- `sw.js` : liste des ressources mises en cache. Lors d’une nouvelle version, mettre à jour le nom du cache et la liste des fichiers si nécessaire. Les migrations futures de la base devront conserver les données et être testées avant publication.

## Hors périmètre de cette version

Suivi GPS garanti en arrière-plan ou écran éteint, conservation d’une trace GPS, déclenchement Bluetooth ou NFC, sauvegarde automatique ou Google Drive, notifications en arrière-plan, aide au diagnostic automatisée, OCR, liaison OBD, carte des stations, synchronisation multi-appareils, prévisions budgétaires, import Drivvo et rattachement d’un document à une intervention précise ne sont pas implémentés. Les pistes et limites pour la suite du module Trajets figurent dans `docs/plan-trajets.md`.
