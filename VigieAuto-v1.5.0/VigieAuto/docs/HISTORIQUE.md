# Historique du projet VigieAuto

**Dernière mise à jour : 31 octobre 2026 · PWA 1.5.0 · Android 0.2.0**

Ce journal rassemble les demandes, les décisions, les réalisations, les corrections et les limites du projet. Il est tenu au fil des échanges : chaque évolution doit être ajoutée ici, sans effacer les décisions précédentes, et les changements de périmètre doivent être indiqués explicitement.

> **Reconstitution :** les premières étapes ci-dessous sont établies à partir du contexte conservé et des versions du projet. Les dates et la formulation exacte de toutes les anciennes demandes ne sont pas disponibles. Les éléments dont le statut est incertain sont marqués comme tels ; ce document n’invente pas de validation manquante.

## Premières étapes — demande initiale et première application

### Demandes et contraintes

- Créer une application française de suivi automobile, d’abord appelée **CQ Auto**, dans l’esprit de Drivvo mais améliorée et simple à utiliser sur téléphone.
- L’application doit être gratuite, sans publicité ni abonnement, sans compte obligatoire, utilisable hors ligne après installation et avec des données enregistrées localement sur l’appareil.
- Gérer plusieurs véhicules, les entretiens, les pleins et la consommation, les dépenses et statistiques, les rappels, des listes de contrôles qualité personnalisables, des symptômes, des documents et l’export/import des données.
- Pour la base initiale : pas de suivi GPS ni de connexion OBD, pas de synchronisation cloud obligatoire. Un module de trajets facultatif avec GPS et une sauvegarde cloud personnelle ont ensuite été proposés : voir plus loin.
- Préférence pour une PWA en HTML/CSS/JavaScript, IndexedDB, manifest et service worker ; l’architecture exacte reste un moyen, pas une obligation intangible. L’utilisateur possède Android Studio et utilise Android.

### Réalisé

- Création d’une première PWA autonome avec des données locales, un mode découverte fictif, les principaux formulaires, une navigation responsive, des documents locaux, l’export JSON et la restauration après confirmation.
- Mise en place des calculs de consommation entre pleins complets avec prise en compte des pleins partiels, des échéances et des dépenses ; six listes de contrôle qualité initiales sont proposées.
- Mise en cache pour le hors-ligne, documentation et premiers tests. Le projet de départ utilisait notamment le cache applicatif `v1.0.1`.
- Clarifications de fiabilité : les rappels sont visibles dans l’application, sans promesse de notification planifiée application fermée ; la perte du téléphone ou l’effacement du navigateur peut supprimer les données ; l’export n’est pas chiffré.

### Corrections et limites identifiées

- Un calcul de consommation ne doit pas ignorer les pleins partiels, diviser par zéro ou mélanger litres et kWh. Les intervalles incohérents sont écartés.
- L’installation PWA durable requiert une origine adaptée, généralement HTTPS ; ouvrir un fichier local ou une adresse HTTP réseau n’offre pas les mêmes garanties. Les données locales sont liées à l’origine et au navigateur.
- L’application enregistre des symptômes, mais ne remplace pas un diagnostic mécanique.

## Étude visuelle et choix des thèmes

### Demandes et retours

- L’utilisateur a d’abord souhaité voir l’interface existante, puis explorer d’autres propositions et leurs onglets.
- La proposition **1 a été rejetée**. La présentation de la **2** plaisait, mais pas ses couleurs ; les couleurs des **3 et 4** plaisaient davantage.
- Les adaptations **2A Sauge** et **2B Cyan** ont plu, notamment la carte véhicule sombre de Cyan.
- L’utilisateur a demandé un accueil actionnable et contrasté, l’accès direct aux contrôles qualité **CQ** et un bouton **+** central pour les actions rapides.

### CQ Auto 1.1.1 — réalisé

- Intégration des palettes Sauge et Cyan, d’un accueil Garage, d’un sélecteur de thème, du bouton d’ajout rapide et d’une navigation mobile donnant accès aux autres rubriques.
- Préférence de thème persistée localement, y compris en mode découverte ; export/import de la préférence avec les données réelles.
- Compatibilité des anciennes sauvegardes et conservation des données lors d’une mise à jour testée sur une même origine.
- Correction d’un débordement d’interface à 320 pixels, de libellés tronqués et de plusieurs contrastes ou états ambigus. Tests de navigation, de formulaires, de sauvegarde et de hors-ligne.

### CQ Auto 1.2.0 — demande et réalisation

- Demande explicite : **Sauge doit avoir ses versions claire et sombre, et Cyan aussi, chacune suivant le mode du téléphone.**
- Ajout de Sauge sombre et du passage clair/sombre en direct pour chaque palette. L’ancien comportement a été conservé sous **Automatique (mixte)** : Sauge clair, Cyan sombre.
- Conservation des préférences, prise en charge des anciennes sauvegardes et mise à jour du cache du service worker. Tests des quatre variantes et de la migration depuis 1.1.1 sur la même origine.

## Proposition de suivi des trajets et de sauvegardes

### Demandes et idées présentées

- Module Trajets **facultatif**, lié au véhicule, avec saisie manuelle et rattrapage après coup ; proposition d’un démarrage par Bluetooth, NFC ou bouton manuel.
- GPS et éventuellement accéléromètre pour distance, durée et répartition indicative du type de trajet ; historique, filtres, trajets récurrents, notes facultatives et estimation du coût énergétique.
- Idées de score éco, d’aide à l’analyse de consommation, de rappel de sauvegarde après environ 30 jours, de PDF d’entretien et de sauvegarde automatique dans un dossier ou un cloud personnel.
- Vie privée : stockage local, permissions adaptées, export et suppression ; le suivi et toute option cloud doivent rester facultatifs.

### Points techniques et choix ouverts

- La PWA ne garantit pas un suivi GPS continu ni une détection universelle de l’autoradio en arrière-plan. Web NFC a des contraintes de visibilité, de matériel et de déverrouillage ; le Bluetooth/NFC automatique demandé n’est pas réalisé.
- La sauvegarde automatique dans Google Drive ou un dossier lié n’est pas réalisée. Toute option cloud doit être séparée et explicitement autorisée ; une copie locale seule ne protège pas contre la perte du téléphone.
- Le GPS ne mesure ni la santé de l’EGR ou des injecteurs, ni la consommation exacte d’un trajet. Aucun régime moteur universel de « décrassage » ne doit être prescrit.
- **Score éco : non arbitré et non implémenté.** Les questions de fréquence des demandes à l’arrivée, de conservation d’une trace GPS et de priorités techniques restent ouvertes.
- Les détails et sources utiles à l’étude restent dans `docs/plan-trajets.md`.

## VigieAuto 1.3.1 — nom, logo, navigation et premiers trajets

### Demandes et décisions

- L’utilisateur propose puis valide le nom **VigieAuto** et fournit une image : bouclier, profil de voiture et coche sur dégradé bleu-vert.
- L’image fournie est destinée à l’icône PWA ; dans l’application, le dessin doit suivre la couleur Sauge ou Cyan. Android peut adapter la forme affichée de l’icône.
- La navigation demandée comporte cinq onglets : **Accueil, Entretien, Pleins, Trajets, Réglages**. Les accès **CQ** et **+** ont été conservés respectivement en haut de l’écran et au centre au-dessus de la barre mobile.
- L’utilisateur demande ce qu’il doit faire du ZIP et rappelle son souhait d’une PWA gratuite et hors ligne.

### Réalisé

- Renommage visible de CQ Auto en VigieAuto ; l’image originale est conservée dans `assets/logo-original.png`, l’icône 512 est cette image redimensionnée, et un tracé SVG fidèle suit les variables du thème dans l’interface. Une variante compatible avec le masquage Android a été préparée.
- Ajout de l’onglet **Trajets manuels** : chronomètre démarré/terminé par l’utilisateur, saisie d’un trajet passé, distance, durée, notes et type déclaré, historique par véhicule et filtre.
- Les types « trafic haché », « roulant » et « croisière » sont **déclaratifs**, pas un diagnostic ou une détection automatique. Un coût énergétique indicatif est calculé à partir des intervalles de pleins valides ; il ne mesure pas le coût réel d’un trajet.
- Conservation du nom interne de l’ancienne base, migration IndexedDB vers la version 2 avec collection `trips`, sauvegarde VigieAuto au format 2 et import des sauvegardes CQ Auto au format 1.
- Ajout du guide `INSTALLER.md` : le ZIP est le code source, pas un APK ; un hébergement HTTPS est nécessaire pour une installation PWA durable.
- Tests des calculs, des thèmes, de la navigation, des trajets, de plusieurs véhicules, des sauvegardes, de la suppression, du hors-ligne et de la migration CQ Auto → VigieAuto sur une même origine. Aucune installation sur le téléphone réel de l’utilisateur n’est revendiquée.

### Non réalisé à ce stade

- GPS, déclenchement Bluetooth/NFC, sauvegarde automatique/Drive, notifications en arrière-plan et score éco. Ils ne doivent pas être présentés comme déjà disponibles.

## 31 octobre 2026 — organisation, documentation et nettoyage

### Nouvelle demande

- Tenir dans la durée un **historique complet**, un **cahier des charges** et une **feuille de route** couvrant les demandes, les ajouts, les améliorations et les corrections.
- Supprimer du workspace les éléments devenus inutiles, notamment les anciennes propositions de design, tout en conservant le dossier de code et **les trois derniers ZIP**.
- Le dossier `cq-auto` peut être conservé ou renommé : il est conservé pour ne pas casser les liens et l’aperçu existants ; le produit s’appelle VigieAuto.

### Réalisation — VigieAuto 1.3.2

- Création de ce journal, de `docs/CAHIER-DES-CHARGES.md` et de `docs/FEUILLE-DE-ROUTE.md` ; les trois documents sont inclus dans l’archive.
- Version 1.3.2 consacrée à la documentation et au nettoyage, sans nouvelle fonction métier. La version du cache est mise à jour pour une diffusion cohérente.
- Suppression des anciens comparateurs, galeries et captures de design devenus redondants, ainsi que des doublons d’archives. Le logo original reste conservé dans le projet.
- Politique retenue : conserver les **trois archives versionnées de versions distinctes** les plus récentes, sans multiplier les copies génériques identiques. Après cette mise à jour : VigieAuto 1.3.2, VigieAuto 1.3.1 et CQ Auto 1.2.0.
- Ajout du script `scripts/creer-archive.py` pour les futures livraisons : simulation possible, contrôle de version et vérification du ZIP avant nettoyage des anciennes archives du projet ; préservation des ZIP personnels et des conflits non identiques.
- Tests sur cette version : 9 tests de calcul, suites navigateur d’interface et trajets, 8 tests isolés de l’outil d’archivage ; migration depuis la véritable archive 1.3.1 avec véhicule, trajet et chronomètre en cours, puis hors-ligne. Les tests sur le téléphone physique restent à faire.

## 31 octobre 2026 — installation indiquée, puis trajets GPS

### Demande / décision

- L’utilisateur indique avoir effectué la publication/installation Android et souhaite passer directement au code pour améliorer les trajets : GPS facultatif d’abord, puis étude des déclenchements Bluetooth ou NFC. Les limites de l’exécution d’une PWA en arrière-plan sont reconnues. L’adresse exacte et le détail des essais réalisés sur son appareil n’ont pas été communiqués.
- Première approche choisie pour protéger la vie privée : conserver un résumé de distance, pas de trace des coordonnées. Ce choix peut être révisé avec l’utilisateur ; il ne vaut pas validation d’une conservation future de positions précises.

### Réalisé — VigieAuto 1.4.0

- Ajout d’un démarrage **Avec GPS** à côté du chrono manuel, après explications et choix explicite ; autorisation du navigateur requise. Estimation locale, pause, reprise, distance vérifiable/corrigeable à l’arrivée et signalement des interruptions détectées.
- Les positions GPS servent uniquement au calcul en mémoire ; aucune coordonnée ni trace n’est enregistrée automatiquement par l’application. Un résumé, les champs saisis par l’utilisateur et les indicateurs d’interruption restent sur l’appareil et dans les exports.
- Le suivi est suspendu quand la page est masquée ; reprise possible au retour visible dans la même session après une position, mais reprise manuelle après réouverture/rechargement/import. Les points séparés par une coupure détectée ne sont pas reliés. Le suivi écran éteint/app fermée reste non garanti et la distance reste indicative.
- Export JSON au format 3 avec import des formats précédents 1 et 2 ; schéma IndexedDB toujours en version 2. Tests de la mise à jour depuis le ZIP 1.3.2 sur la même origine et en sous-dossier, avec véhicule, document, thème, historique et chronomètre conservés.
- Protection supplémentaire des écritures : démarrage transactionnel d’un seul trajet, mise à jour GPS conditionnelle, verrou entre fenêtres lorsque Web Locks est disponible et suppression du véhicule en cascade dans une transaction. Il reste conseillé d’utiliser une seule fenêtre pendant le suivi.
- Numéro de version affiché dans Réglages pour vérifier une publication. Documentation, cahier des charges et feuille de route mis à jour ; script d’archive complété pour contrôler cette version affichée et le module GPS.
- Tests automatisés : calculs GPS et métier, interface, saisie manuelle, permissions et positions GPS simulées, coupures, import/export, sous-dossier, hors-ligne, concurrence et tests isolés de l’archivage. Une permission et une position émulées ont aussi été exercées via l’API Geolocation réelle de Chromium. Aucun test GPS physique ni publication de 1.4.0 sur le site de l’utilisateur n’est revendiqué.

### En attente / limites

- Après sauvegarde, l’utilisateur doit publier la nouvelle version au **même emplacement HTTPS**, rouvrir l’app en ligne, vérifier « version 1.4.0 » et tester le GPS sur son Android en sécurité. Les détails figurent dans `INSTALLER.md`.
- NFC et Bluetooth ont été étudiés mais ne sont pas implémentés : NFC nécessite notamment une page visible, du matériel et un badge compatibles ; Web Bluetooth vise les périphériques BLE et ne garantit pas une détection silencieuse d’autoradio classique. Une partie Android native/hybride demanderait une validation séparée. Voir `plan-trajets.md`.
- Sauvegarde automatique/Drive, score éco et autres évolutions prévues restent en attente. La localisation système peut dépendre de fournisseurs et de réglages extérieurs à l’application.
- Livraison et rangement : archive 1.4.0 vérifiée ; trois ZIP versionnés conservés : 1.4.0, 1.3.2 et 1.3.1 ; les captures et fichiers temporaires sont retirés après les tests.

## 31 octobre 2026 — question d’une version Android native

### Demande et contexte

- L’utilisateur demande pourquoi VigieAuto est une PWA et si elle peut être développée dans un format comparable à ses autres applications : Santé décrite en Kotlin/Jetpack Compose, et LIFTQ décrite en Flutter/Dart. Ces deux projets sont cités à titre de référence ; leurs sources n’ont pas été examinées dans cet espace.
- Son message comprend une proposition d’architecture et un choix à faire entre Kotlin/Compose, Flutter et le maintien de la PWA. Il ne précise pas encore une option définitivement retenue, ni le périmètre du premier lot, ni l’identifiant de package.
- Les exigences existantes demeurent : application gratuite, sans publicité ni compte obligatoire, hors ligne, données locales, trajets manuels et GPS facultatifs, pas de conservation de trace par défaut, et sauvegarde personnelle facultative. Bluetooth/NFC restent souhaités mais doivent respecter les contraintes Android et le consentement.

### Étude et sécurité des données

- Kotlin/Compose est une piste adaptée à une priorité Android et au modèle Santé ; Flutter peut aussi accéder aux API Android via des plugins ou du code natif et convient mieux si un objectif multiplateforme est retenu. Le choix ne doit pas être supposé.
- Une application native est distincte de la PWA : elle ne récupère pas directement la base IndexedDB du navigateur. Prévoir une migration par export JSON, prenant en compte les formats existants et les photos/documents, avec validation et tests. Conserver la PWA et une copie externe jusqu’à vérification de la migration.
- GPS via service de premier plan, Bluetooth et NFC restent soumis aux permissions et aux restrictions d’Android ; aucune détection universelle silencieuse ni notification d’alarme exacte systématique n’est garantie. Les sources et détails seront à documenter lors du choix d’architecture.
- L’adresse publique copiée dans le message renvoie un HTTP 404 depuis notre accès au moment du contrôle ; cela ne permet pas de connaître l’état du cache ou des données sur le téléphone. L’adresse effective et l’état de publication restent à confirmer ; ne pas désinstaller l’application ni effacer son stockage sans sauvegarde vérifiée.

### État

- Étude et mise à jour des documents de suivi uniquement ; aucun socle Android, APK, migration ni nouveau ZIP ne sont encore réalisés. Le code et les trois archives précédentes sont conservés. La documentation de travail évolue après la livraison 1.4.0 et sera incluse dans le prochain ZIP de livraison.

## 31 octobre 2026 — décision Android natif + PWA iPhone, lot A 0.1.0

### Demande et décision

- L’utilisateur choisit **Kotlin/Jetpack Compose + Room pour Android**, et le maintien de la **PWA pour l’iPhone** de ses proches. Il ne dispose ni d’un Mac ni d’un compte développeur Apple payant et ne veut pas de serveur obligatoire. Les appareils échangeront des exports JSON manuels, pas une base automatiquement partagée.
- Commencer par le **lot A** : structure Android, navigation, accueil, modèles de stockage et format commun. Prévoir ensuite le lot B (véhicules, entretien, rappels, pleins, trajets manuels), le lot C (GPS natif facultatif avec notification et Bluetooth assisté), puis la stabilisation/installation iPhone. NFC reste une piste, pas une fonction promise.
- Conserver la gratuité, le fonctionnement local, le français, les thèmes Sauge/Cyan suivant l’apparence du téléphone, le logo choisi, l’accès CQ et le bouton central `+`. L’identifiant de package n’a pas été décidé : **`com.vigieauto.app` est provisoire**.

### Réalisé et corrigé

- Projet source `VigieAuto-Android` séparé : Gradle Wrapper, Kotlin, Compose/Material 3, écrans et navigation Accueil/Entretien/Pleins/Trajets/Réglages, accès CQ, préférence de thème et logo. Le bouton `+` informe que les saisies viendront plus tard. Les fiches et listes affichées sont partielles et en lecture seule.
- Room possède deux tables génériques (`records` et `payload_chunks`), et non des entités métier normalisées : le JSON de chaque objet est conservé en blocs avec taille et empreinte SHA-256. Le schéma Room v1 est fourni pour préparer de futures migrations.
- Contrat de sauvegarde : lecture des formats Web 1/2/3, validation avant confirmation, remplacement en transaction et export en format 3. Champs supplémentaires conservés dans chaque entrée ; clés racine ou collections inconnues refusées pour éviter une perte silencieuse. Une collection inconnue présente dans Room bloque aussi l’export. Un trajet GPS en cours est marqué interrompu, sans reprise automatique.
- Correction détectée en test : l’écriture JSON de Gson omettait les propriétés `null` exigées par le validateur Web ; `serializeNulls()` les préserve désormais. Ajout de limites de taille, contrôles des liens/identifiants, nettoyage des fichiers temporaires et vérification d’intégrité des blocs.
- Dans le manifeste source, aucune permission Internet, GPS, Bluetooth ou NFC. Sauvegarde système désactivée et règles Android 12+ excluant aussi les domaines de données des transferts standards entre appareils ; seules les copies JSON choisies explicitement assurent le transfert prévu. Le fichier choisi peut lui-même être sur un service distant si l’utilisateur le sélectionne.
- Documentation globale mise à jour et recopiée côté Android ; guides d’installation, d’architecture et de format ajoutés. Les outils d’archivage distinguent les versions Web et Android pour conserver trois ZIP de projet sans toucher aux archives personnelles non reconnues. Le code applicatif Web 1.4.0 reste inchangé.

### Vérifications

- Compilation `:app:assembleDebug` réussie, y compris depuis une archive provisoire extraite ; le wrapper Gradle 8.11.1 a été téléchargé et vérifié. L’APK de contrôle indique Android 11 minimum (API 30), cible 36, et aucune permission réseau/GPS/Bluetooth/NFC ; une permission interne AndroidX de récepteur non exporté est présente. Ce n’est pas un APK de publication.
- **38 tests Android automatisés réussis**, puis relancés depuis l’archive provisoire extraite, avec fichier de retour fourni. Ils couvrent notamment la validation v1 synthétique et des exports fictifs issus des vraies PWA 1.3.2 et 1.4.0, Room sous Robolectric, import atomique, annulation, démarrage simulé, règles de confidentialité et document de 5 Mio. Sans fichier de retour, le test optionnel correspondant est ignoré.
- Pont exercé sur données fictives : import PWA → Room simulée → export Android → véritable import IndexedDB par la PWA 1.4.0 → export Web → retour Room simulée. Passage également testé avec un document de 5 Mio et avec un export 1.3.2 converti en format 3. Les tests ne prouvent pas l’absence de problèmes avec tous les fichiers ou tous les téléphones.
- Android Lint réussi avec **0 erreur et 10 avertissements** : neuf signalent des versions plus récentes de Gradle/bibliothèques, une la complexité du logo vectoriel ; les versions ont été conservées pour ce lot testé. Cinq tests isolés de l’archiveur Android et neuf tests de l’archiveur Web réussis. Les 15 tests métier Web, les scénarios d’interface et la migration 1.3.2 → 1.4.0 ont aussi été relancés avec succès. Aucun essai physique Android, iPhone ou GPS n’a été effectué par cet environnement. La publication de la PWA et l’adresse publique restent à confirmer par l’utilisateur.

### À faire et sécurité

- Le lot A **ne sait pas encore ajouter, modifier ou supprimer les données métier** ; pas de GPS natif, Bluetooth, NFC, notifications, synchronisation, chiffrement Room/JSON ou sauvegarde automatique. La PWA reste le carnet utilisable aujourd’hui.
- Importer remplace les données du destinataire et ne fusionne pas ; confirmer avec une copie et conserver la PWA et au moins une sauvegarde externe vérifiée. Les fichiers JSON sont personnels et non chiffrés. Changer le package ou la signature d’une installation Android ne migre pas automatiquement sa base.
- Lots B/C/D et essais sur vrais appareils restent à réaliser ; le transfert de la 1.4.0 sur l’hébergement existant n’a pas été fait par l’agent.

### Livraison et rangement

- `VigieAuto-Android-v0.1.0.zip` contient les sources, le wrapper sans clé privée, les tests et la documentation ; pas d’APK signé de production. Les deux dossiers de code sont conservés, ainsi que les trois ZIP de projet Android 0.1.0, Web 1.4.0 et Web 1.3.2 après vérification de l’archive Android.
- Les fixtures de test sont fictives ; les dépendances et fichiers intermédiaires ne font pas partie des archives. Le ZIP Web 1.3.1 est retiré suivant la règle des trois versions, seulement après vérification de la nouvelle archive.

## 31 octobre 2026 — référentiel commun et ajout de véhicule

### Demande et décisions

- Conserver Kotlin/Compose + Room sur Android et la PWA familiale sur iPhone, sans serveur ni synchronisation obligatoire. Proposer des **listes courtes mais toujours complétables par saisie libre**, avec recherche, « Autre… », modèles liés à la marque, derniers choix et mémorisation locale après validation. Ne jamais refuser une marque ou un modèle au seul motif qu’il manque au référentiel ; ne pas imposer une génération de Clio.
- Ordre demandé : d’abord Renault, Peugeot, Citroën, Dacia, Volkswagen, Toyota, Ford, Opel, Fiat, Nissan, BMW, Mercedes-Benz, Audi, Hyundai, Kia, Seat, Škoda, DS, Mini et Tesla ; puis les autres marques courantes et enfin les anciennes Rover, Saab, Lada, Daewoo, Chrysler, Dodge et Datsun. Les modèles détaillés demandés pour Renault, Peugeot, Citroën, Dacia, Volkswagen, Toyota, Ford, BMW, Mercedes-Benz, Audi, Fiat, Nissan et Opel sont conservés dans le référentiel versionné `data/brands_models_fr.json`, copié à l’identique côté Android. Les autres marques ont 5 à 12 propositions.
- Année numérique libre et facultative, sept énergies dont hybride rechargeable et **Autre** libre, finition/motorisation et immatriculation facultatives ; kilométrage actuel obligatoire à l’ajout. L’utilisateur donne Renault / Clio / 2008 / Diesel / 1.5 dCi 68 comme premier exemple **sans kilométrage**. Le proposer explicitement sans créer automatiquement un véhicule ni inventer cette valeur.
- Modification du nom d’une marque personnalisée dans des réglages avancés reportée à une version ultérieure. Entretien/rappels, pleins et trajets manuels Android restent les prochaines étapes ; GPS natif facultatif et Bluetooth assisté ensuite, puis stabilisation iPhone. NFC reste une possibilité, non une promesse.

### Réalisé / corrigé

- Deux copies identiques du référentiel embarqué **v1** : 48 marques, 432 modèles et sept énergies, disponibles hors ligne. PWA 1.5.0 : `input` + `datalist`, boutons de saisie libre compatibles avec une saisie ordinaire, recherche et modèles filtrés ; Android 0.2.0 : Compose `ExposedDropdownMenu`, dialogues « Autre… », écran de création depuis l’accueil et le `+`, et sélection d’un véhicule déjà ajouté.
- Suggestions et dernières valeurs enregistrées dans `settings.vehicleSuggestions` (version 1) du JSON commun ; propriétés inconnues conservées, format incompatible refusé avant écrasement. Champs véhicules restent des textes. PWA : véhicule, suggestions et sélection écrits dans une transaction IndexedDB, avec fusion des suggestions concurrentes entre onglets. Android : table Room `suggestions_perso`, migration **v1 → v2 sans suppression**, reconstruction au démarrage/à l’import et transaction commune d’ajout.
- Les codes d’énergie existants restent inchangés : hybride rechargeable = `fuel: hybride` + détail ; énergie libre = `fuel: autre` + détail. L’ancienne PWA conserve ce champ inconnu mais ne l’affiche pas ; si elle change le code sans changer le détail, la nouvelle PWA affiche le **code actuel** plutôt qu’un détail devenu contradictoire.
- La PWA conserve IndexedDB v2 et exporte toujours du JSON format 3 ; Android continue à importer v1/v2/v3 et conserve les photos, documents et propriétés supplémentaires. Les imports restent confirmés, transactionnels et **remplacent** les données du destinataire. Guides Android/PWA, version des caches, scripts et documentation mis à jour.

### Vérifications et limites

- Tests métier et de sauvegarde, formulaires et hors-ligne en navigateurs automatisés ; tests avec WebKit et coupure d’accès serveur (ce n’est pas Safari sur iPhone). **56 tests Android automatisés réussis**, aucun ignoré lorsque les fichiers de retour fictifs sont fournis, et compilation Android de contrôle réussie. Migrations PWA réelles depuis les ZIP 1.3.2 et 1.4.0 vers 1.5.0, sur la même origine, avec données fictives.
- Migration Room testée depuis une base créée avec le vrai schéma v1 et des données fictives ; validations, rollback, persistance, champs inconnus et pont bidirectionnel Web/Room simulée. La vraie PWA 1.4.0 a importé et réexporté les nouvelles données et conservé le détail d’énergie et les suggestions lors de modifications ; la nouvelle PWA a ensuite réimporté le retour.
- Les tests automatisés et compilations ne sont **pas** un essai sur téléphone, sur iPhone, ni une publication sur le site de l’utilisateur. Garder les deux applications et des sauvegardes externes vérifiées. Android n’offre pas encore la modification/suppression de véhicules ou les saisies d’autres rubriques ; pas de GPS natif, Bluetooth, NFC, notification ou cloud automatique dans ce lot.

### Livraison et rangement

- Les archives de projet de cette évolution sont `VigieAuto-v1.5.0.zip` et `VigieAuto-Android-v0.2.0.zip`. Après leur vérification, la règle commune des trois ZIP conserve également la PWA 1.4.0 ; les ZIP de projet Android 0.1.0 et PWA 1.3.2 ont été retirés. Les dates de fichiers reconstituées ont influencé ce classement ; les sauvegardes personnelles ne sont pas touchées.

## 31 octobre 2026 — clarification et rangement de l’espace de travail

- L’utilisateur signale que les nombreux processus/aperçus de tests et un avertissement de capacité rendent l’espace difficile à lire. Les processus de test sont arrêtés et leurs caches temporaires Android/Gradle ont été supprimés ; les deux dossiers de code, les documents et les sauvegardes personnelles sont conservés.
- L’avertissement mentionnait huit fichiers non conservés lors d’un instantané ; leur liste n’était pas disponible. Les fichiers sources indispensables, les deux schémas Room, les guides, les tests et les deux copies du référentiel ont été vérifiés présents avant archivage. Les fichiers de compilation et dépendances temporaires ne sont pas nécessaires dans les ZIP. Les essais effectués avant nettoyage restent des essais simulés, pas des tests sur téléphone.

## Modèle pour les prochaines entrées

Pour chaque changement, ajouter une entrée datée avec :

1. **Demande / décision** : ce que l’utilisateur souhaite, accepte, modifie ou refuse.
2. **Réalisé / corrigé** : ce qui a réellement changé, dans quelle version et où.
3. **Tests** : ce qui a été vérifié et les limites des vérifications.
4. **En attente / risques** : ce qui reste à décider ou qui n’est pas implémenté.
5. **Livraison et nettoyage** : archive créée, archives conservées et éléments temporaires retirés.
