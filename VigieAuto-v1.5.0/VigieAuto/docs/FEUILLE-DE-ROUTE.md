# Feuille de route — VigieAuto

**Mise à jour : 31 octobre 2026 · PWA : 1.5.0 · Android : 0.2.0**

Cette feuille de route distingue ce qui est terminé, ce qui est souhaité et les décisions à prendre. Les priorités des futures étapes sont **des propositions à confirmer**, pas des dates ou engagements de livraison. Le détail des exigences est dans `CAHIER-DES-CHARGES.md` et l’historique des décisions dans `HISTORIQUE.md`.

## Terminé dans la PWA

| Étape | Résultat |
|---|---|
| Carnet local | ✅ Véhicules, entretien, pleins, dépenses, rappels dans l’app, contrôles qualité, symptômes, documents, statistiques et JSON manuel. |
| Design et identité | ✅ Sauge et Cyan, clair/sombre selon le téléphone ; cinq onglets, accès CQ, bouton +, nom et logo VigieAuto. |
| Installation initiale | ✅ L’utilisateur indique avoir publié/installé l’application sur Android. Les détails des essais sur son téléphone ne sont pas documentés ; l’aperçu de développement reste temporaire. |
| Trajets manuels | ✅ Saisie manuelle, chronomètre, historique par véhicule et coût énergétique indicatif. Les trois types sont déclarés, pas calculés. |
| GPS facultatif — première étape | ✅ Estimation de distance page visible, permission, pause, reprise, interruption détectée et correction à l’arrivée, sans sauvegarde de la trace. ❌ Le fonctionnement continu écran éteint ou app fermée n’est pas garanti. |
| Suggestions véhicules communes | ✅ Référentiel français v1, recherche, saisie libre et mémorisation ; formulaire de véhicule sur la PWA 1.5.0 et Android 0.2.0, avec migration Room et pont JSON. |
| Documentation et rangement | ✅ Historique, cahier des charges et feuille de route tenus ; script d’archives et tests ; trois dernières archives versionnées conservées. |

## Stratégie retenue : Android natif + PWA familiale

L’utilisateur retient **Android Kotlin/Compose pour l’usage avancé** et la **PWA pour la famille sur iPhone**. Les bases sont indépendantes et s’échangent des fichiers JSON manuellement ; ce n’est pas une synchronisation ni un partage en direct.

1. **Lot A — fondation Android 0.1.0 :** projet séparé `VigieAuto-Android`, écran Compose, navigation, thèmes, Room et pont JSON. Consultation partielle seulement, sans ajout ni GPS/Bluetooth ; vérifications et limites détaillées dans l’historique et le projet Android.
2. **Lot B — reprise du carnet :** création/sélection des véhicules réalisées en 0.2.0 ; ajouter leur modification/suppression puis progressivement les modèles métier typés et la saisie des entretiens, pleins, rappels et trajets manuels ; poursuivre avec CQ, dépenses, symptômes, documents et statistiques pour retrouver les fonctions attendues. Tester les migrations Room et la compatibilité JSON.
3. **Lot C — trajets avancés Android :** GPS facultatif avec service de premier plan et notification, puis Bluetooth assisté ; matériel, permissions, démarrage possible et limites Android à tester. NFC reste ultérieur et facultatif.
4. **Lot D — Web famille :** garder la PWA, documenter l’installation Safari et tester sur de vrais iPhone. Aucun Bluetooth automatique ou synchronisation n’est promis. Vérifier qu’une adresse HTTPS réelle est accessible.

Le package de travail `com.vigieauto.app` n’a pas été confirmé et doit l’être avant diffusion ou installation pérenne ; une clé de signature de production reste à définir. Avant toute migration, conserver la PWA et un export vérifié ; les imports remplacent les données du destinataire.

L’adresse publique copiée a renvoyé 404 depuis notre accès. Cela ne permet pas de conclure sur l’installation locale ; vérifier l’adresse et ne pas effacer de données sans sauvegarde.

## Prochaines étapes PWA conservées

### 1. Déployer et essayer le GPS sur le téléphone déjà installé

- Sauvegarder les données depuis l’application installée, puis publier **le contenu** du ZIP 1.5.0 au même emplacement et à la même adresse HTTPS que la version actuelle. Voir `INSTALLER.md` ; aucune mise à jour du site de l’utilisateur n’est effectuée automatiquement depuis cet espace de travail.
- Rouvrir l’app en ligne et vérifier **Réglages → version 1.5.0**, les données existantes, l’icône et le fonctionnement hors ligne.
- À l’arrêt, tester la permission, le signal, la distance sur un court déplacement en sécurité, les interruptions et la correction à l’arrivée. Les tests automatisés utilisent des positions simulées et ne remplacent pas cet essai réel.
- Si nécessaire, ajuster le filtre GPS et l’interface en fonction des observations, sans prétendre suivre en continu application fermée ou écran éteint.

### 2. Déclenchement par NFC ou Bluetooth — demandé, à décider avant développement

- **NFC :** piste d’un badge NDEF associé à un véhicule, lu après lancement volontaire d’un scan dans l’application visible et téléphone déverrouillé. Vérifier la présence de NFC sur le téléphone et disposer d’un badge compatible. Aucun déclenchement universel depuis une PWA fermée n’est promis.
- **Bluetooth :** étudier le matériel exact. Web Bluetooth vise les périphériques BLE et ne garantit pas la détection automatique d’un autoradio classique ni l’exécution dans un service worker.
- **À décider :** matériel disponible, association au véhicule et action attendue à l’approche/à la deuxième lecture. L’Android natif est désormais choisi ; le Bluetooth assisté viendrait au lot C après le GPS, avec permissions, restrictions et essais réels. NFC reste une piste distincte.

### 3. Renforcer les sauvegardes — demandé, méthode à définir

- Garder l’export/import JSON manuels complets, avec copies externes ; le fichier n’est pas chiffré.
- Étudier un rappel de sauvegarde dans l’application, par exemple après 30 jours, sans faire croire qu’un téléchargement garantit une copie externe.
- Étudier la demande de sauvegarde automatique dans un dossier ou sur Google Drive personnel : permissions, compatibilité, état de réussite visible, gestion des erreurs et secours manuel. Aucune automatisation ni synchronisation Drive n’existe actuellement.
- **À valider :** solution, fréquence, éventuelle protection des sauvegardes et consentement si cloud. Le cloud exige une connexion et modifie le périmètre local ; il doit rester facultatif. Un PDF éventuel ne remplacerait pas une sauvegarde complète restaurable.

### 4. Autres améliorations — selon les priorités de l’utilisateur

- Trajets : filtres, récurrences et questions facultatives utiles ; toute conservation d’une trace GPS précise nécessiterait une décision explicite. Score éco non arbitré.
- Carnet : étudier le rattachement de documents à une intervention, les rapports PDF et d’autres demandes à venir.
- Évaluer les notifications application fermée selon la plateforme sans promettre une planification fiable par le seul service worker.
- OBD, OCR, stations, import Drivvo et synchronisation multi-appareils ne sont pas implémentés ; ne les ajouter qu’après choix explicite du périmètre.

## En continu à chaque évolution

1. Enregistrer les demandes et décisions dans `HISTORIQUE.md` ; actualiser cette feuille de route et `CAHIER-DES-CHARGES.md`, avec des statuts honnêtes.
2. Protéger les données existantes : migrations IndexedDB versionnées si nécessaire, import d’anciens JSON compatible et restauration atomique ; rappeler l’export avant mise à jour ou changement d’adresse.
3. Tester les calculs, l’interface, les tailles d’écran, l’accessibilité, les thèmes, le hors-ligne et les parcours concernés. Tester les migrations et les exports/imports lorsque les données changent.
4. Vérifier l’installation et les permissions sur de vrais appareils lorsque la fonctionnalité en dépend ; distinguer ces essais des tests automatisés.
5. Versionner chaque branche indépendamment : pour la PWA, `package.json`, `package-lock.json`, `sw.js` et `APP_VERSION` ; pour Android, Gradle `versionName`/`versionCode`, schémas Room et migrations. Actualiser la documentation puis tester avant l’archivage. Les deux projets ont un script `scripts/creer-archive.py` avec `--dry-run`.
6. Ranger le workspace : conserver **les deux dossiers de code complets** et les **trois derniers ZIP de versions distinctes tous projets confondus** ; supprimer les fichiers temporaires inutiles, sans supprimer les données ou sauvegardes personnelles. Les scripts reconnaissent les deux branches, classent les versions dans chaque branche et les intercalent selon la date des fichiers ; vérifier le résultat si des dates ont été modifiées manuellement.

## Archives conservées après la livraison des suggestions

1. `VigieAuto-Android-v0.2.0.zip` — sources Android, ajout et suggestions de véhicules.
2. `VigieAuto-v1.5.0.zip` — PWA, référentiel et suggestions libres.
3. `VigieAuto-v1.4.0.zip` — PWA précédente, avec GPS facultatif.

Ce sont les trois archives de projet actuellement conservées. Le classement dépend des dates des fichiers, qui peuvent être reconstituées par l’espace de travail ; les sauvegardes personnelles ne sont pas des archives de projet à supprimer.

Ne retirer la plus ancienne archive de projet reconnue qu’après création et vérification de la nouvelle. Les ZIP de données personnelles ou de provenance inconnue ne sont pas touchés.
