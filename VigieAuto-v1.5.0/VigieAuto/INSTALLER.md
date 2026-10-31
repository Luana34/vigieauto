# Installer la PWA VigieAuto sur Android ou iPhone

## À quoi sert le ZIP ?

Le ZIP contient les **fichiers du projet**, pas une application Android `.apk`. Il ne s’installe donc pas en touchant le ZIP, et il n’est pas nécessaire de l’ouvrir dans Android Studio pour utiliser la version PWA.

Pour essayer l’interface tout de suite, utilisez l’aperçu de l’application dans la conversation. Cet aperçu est temporaire : ne le considérez pas comme un hébergement permanent de vos données.

Pour installer durablement la PWA, il faut publier ses fichiers à une **adresse HTTPS stable**, puis ouvrir cette adresse avec Chrome sur Android. La première visite demande Internet ; après mise en cache, l’application peut fonctionner hors ligne.

## Exemple : publication gratuite avec GitHub Pages

Cette méthode demande un compte GitHub à la personne qui **publie le code**. En revanche, VigieAuto ne demande pas de compte à ses utilisateurs et leurs données restent dans leur navigateur. Vérifiez les conditions et limites en vigueur du service choisi.

1. Sur un ordinateur, téléchargez le ZIP puis extrayez-le. Ouvrez le dossier `VigieAuto` obtenu. Il contient notamment `index.html`, `sw.js`, `manifest.webmanifest` et les dossiers `css`, `js`, `data`, `assets` et `icons`.
2. Sur GitHub, créez un nouveau dépôt public, par exemple `vigieauto`. Un dépôt public rend **le code de l’application** visible ; n’y déposez jamais vos sauvegardes JSON ni vos documents personnels.
3. Dans le dépôt, choisissez l’ajout de fichiers, puis téléversez **le contenu du dossier `VigieAuto`**, en préservant les dossiers et noms des fichiers. Vérifiez que `index.html` apparaît à la racine du dépôt, au même niveau que `sw.js` et les dossiers `js` et `css`. Validez l’envoi (« Commit changes »).
4. Dans les paramètres du dépôt, ouvrez **Pages**. Sélectionnez une publication depuis la branche `main` et le dossier `/ (root)`, puis enregistrez. Attendez la fin de la publication : GitHub affiche alors une adresse HTTPS.
5. Sur le téléphone Android, ouvrez cette adresse HTTPS dans **Chrome**. Dans son menu **⋮**, choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil », selon le libellé proposé, puis confirmez.
6. Ouvrez l’application installée une première fois avec Internet. Ensuite, activez temporairement le mode avion et vérifiez que l’accueil et vos données sont encore accessibles. Désactivez le mode avion après le test.

Sur **iPhone**, ouvrez la même adresse HTTPS dans Safari, puis choisissez **Partager → Sur l’écran d’accueil**. Le stockage de l’application installée peut être distinct de l’onglet Safari : vérifiez puis utilisez l’import JSON si nécessaire. L’export reste manuel et chaque iPhone conserve ses propres données.

Les libellés exacts et le délai de publication peuvent évoluer. Android peut adapter la forme de l’icône, et une installation existante peut mettre un certain temps à actualiser son nom ou son image.

## Si CQ Auto était déjà installé

- Dans l’ancienne application, ouvrez **Paramètres → Exporter mes données** et gardez le JSON en lieu sûr avant la mise à jour.
- Si vous remplacez les fichiers à **exactement la même adresse**, VigieAuto reprend la base locale et ajoute la collection des trajets. Fermez les anciens onglets, ouvrez l’application en ligne, laissez-la se mettre à jour puis rechargez-la. Il peut être nécessaire de la fermer et de la rouvrir en ligne.
- Si vous utilisez **une nouvelle adresse**, un autre navigateur ou un autre téléphone, le stockage peut être différent. Ouvrez VigieAuto, puis importez la sauvegarde depuis **Réglages → Importer une sauvegarde**. L’import remplace les données déjà présentes après confirmation.
- Ne videz pas les données du navigateur et ne désinstallez pas l’ancienne application pour forcer une mise à jour : cela peut effacer le carnet. Les versions anciennes ne reconnaissent pas toutes les nouveautés ; certaines ne lisent pas les formats plus récents. Ne revenez pas en arrière sans copie vérifiée.

## Sauvegardes

Dans **Réglages → Exporter mes données**, téléchargez régulièrement le fichier JSON, puis conservez-en une copie sur un autre support sûr. La sauvegarde inclut des informations personnelles et n’est pas chiffrée par VigieAuto. Aucune sauvegarde automatique sur Google Drive n’est incluse actuellement.

## Mettre à jour une installation déjà publiée vers la version 1.5.0

1. Dans l’application **déjà installée sur votre téléphone**, ouvrez **Réglages → Exporter mes données**. Conservez le JSON hors du téléphone, dans un endroit sûr : il est personnel et non chiffré. Ne le mettez pas dans le dépôt public.
2. Téléchargez le ZIP de la version 1.5.0 et extrayez-le. Il contient un dossier `VigieAuto` ; utilisez **le contenu de ce dossier**.
3. Remplacez les anciens fichiers du site par ceux de la nouvelle version **au même emplacement et à la même adresse HTTPS** : en particulier `sw.js`, `index.html`, `manifest.webmanifest` et les dossiers `js`, `css`, `data`, `assets` et `icons`. Si vous utilisez GitHub Pages, modifiez le même dépôt/la même branche et validez les changements, puis attendez la publication. Ne créez pas un second site pour cette mise à jour.
4. Fermez les autres onglets de l’ancienne version, puis rouvrez VigieAuto **en ligne**. Laissez le temps au service worker de se mettre à jour ; fermez et rouvrez à nouveau si nécessaire. En bas des **Réglages**, vérifiez « version 1.5.0 ». Il n’est normalement pas nécessaire de réinstaller l’application.
5. Vérifiez que vos véhicules et données sont toujours là. Dans **Ajouter un véhicule**, testez les suggestions ou une marque libre ; l’exemple Clio est facultatif et ne remplit aucun kilométrage. Le référentiel `data/brands_models_fr.json` doit avoir été publié avec les autres fichiers. Si vous avez changé d’adresse, de navigateur ou d’appareil, le stockage peut être distinct : utilisez alors **Importer une sauvegarde**, qui remplacera les données présentes après confirmation.
6. Pour tester le GPS à l’arrêt : ouvrez **Trajets → Avec GPS → Autoriser et démarrer**, puis acceptez la localisation si le téléphone la demande. Attendez un signal en extérieur, faites un court essai en sécurité, arrêtez-vous et choisissez **Terminer**. Vérifiez et corrigez la distance avant de l’enregistrer. Les coordonnées ne sont pas enregistrées par l’application.

**Ne videz pas les données du navigateur et ne désinstallez pas l’application pour forcer la mise à jour** : cela pourrait effacer vos données. Si le GPS est refusé, vérifiez les autorisations de localisation du site dans Chrome et les réglages Android, ou utilisez le trajet manuel.

Le suivi GPS fonctionne seulement de façon opportuniste lorsque l’application est visible. Les interruptions détectées sont indiquées ; les portions non mesurées ne sont pas reconstruites. Le suivi écran éteint ou application masquée n’est pas garanti. Le GPS peut consommer de la batterie et l’obtention d’une position sans Internet dépend du téléphone. N’utilisez pas le téléphone en conduisant.
