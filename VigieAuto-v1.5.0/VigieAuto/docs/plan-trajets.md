# VigieAuto — trajets et perspectives techniques

**Version 1.4.0 · 31 octobre 2026**

## Disponible : trajets manuels et GPS facultatif

Le trajet peut être saisi après coup ou commencé par un **chronomètre manuel**, comme auparavant. La durée peut inclure des pauses, reste modifiable et ne mesure pas les mouvements en arrière-plan. Chaque trajet appartient au véhicule de départ ; les trois types de circulation sont **déclarés**, pas déduits de capteurs. La distance d’un trajet ne modifie pas le compteur du véhicule.

À l’arrêt, l’utilisateur peut aussi choisir **Trajets → Avec GPS → Autoriser et démarrer**. Le navigateur demande l’accès à la localisation si nécessaire. La fonctionnalité exige un contexte sécurisé HTTPS ou localhost, un navigateur compatible et une autorisation ; l’aperçu intégré à une autre page peut bloquer la permission. [2](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition)

- VigieAuto calcule une distance approximative localement. **Les coordonnées et la trace de l’itinéraire ne sont pas enregistrées automatiquement ni transmises par l’application.** Le navigateur ou le système peut utiliser ses propres services de localisation pour obtenir une position.
- La base et la sauvegarde contiennent le total GPS estimé, l’indication d’une position obtenue et les interruptions détectées. L’utilisateur choisit librement ce qu’il écrit dans les champs nom, départ, arrivée et notes ; ces textes sont conservés dans le carnet.
- L’app suspend sa demande de position lorsque la page devient masquée. Dans la même session, après une première position, elle essaie de reprendre au retour à l’écran. Après un rechargement, une réouverture ou l’import d’un trajet GPS en cours, la reprise demande une action explicite à l’arrêt. La permission reste révocable dans les paramètres du site/navigateur.
- Le suivi ne fonctionne **pas de manière garantie écran éteint, application fermée ou masquée**. Les interruptions détectées sont signalées ; toutes ne sont pas nécessairement détectables. Une partie du trajet peut manquer. Les distances non mesurées entre deux segments ne sont pas reconstruites.
- L’application peut fonctionner hors ligne après mise en cache. La localisation elle-même peut dépendre du GPS, des réglages Android, du signal et d’éventuels services du système ; une première position hors ligne n’est pas garantie.
- Le bouton **Terminer** arrête la mesure et ouvre le formulaire : la distance estimée est proposée si elle est exploitable, mais reste obligatoire et modifiable. La durée, le type, le nom et les notes sont ajustables. En cas de refus de localisation, d’absence de signal ou d’interruption, on peut saisir la distance manuellement. Ne pas manipuler le téléphone en conduisant.
- La précision réduite, les pauses, les trajets courts, le stationnement, les virages et les coupures peuvent causer une sous-estimation ou une surestimation. Le GPS peut augmenter la consommation de batterie. Le résultat n’est pas une mesure certifiée.

### Méthode actuelle et données

`js/gps.js` garde temporairement en mémoire le dernier point de référence et l’horodatage de la dernière position fiable ; aucun point n’est écrit dans IndexedDB. La distance utilise une formule sphérique entre points et un seuil de mouvement pour limiter le bruit. À titre de garde-fous, le code ignore les positions annoncées à plus de 50 m de précision, les positions anciennes/incohérentes et les mouvements très faibles ; une perte de précision, un trou de plus de 60 s ou un saut dépassant environ 252 km/h est traité comme une rupture, sans tracer de ligne entre les deux segments. Ces seuils sont des compromis à ajuster après de vrais essais, pas des garanties de précision ni une mesure de conduite. [1](https://www.w3.org/TR/geolocation/)

Seules des modifications du résumé sont stockées dans `trips` : `method: "gps"`, `gpsDistanceM`, `gpsHasFix`, `gpsInterrupted`, puis la distance finale confirmée par l’utilisateur. Aucune nouvelle collection IndexedDB n’est nécessaire : le schéma reste à la version 2. L’export est au **format JSON 3** ; les formats VigieAuto 2 et CQ Auto/VigieAuto 1 restent importables. Les anciennes versions peuvent refuser le format 3 et ne doivent pas être utilisées comme retour arrière sans sauvegarde adaptée.

Un démarrage de trajet est protégé par une transaction IndexedDB pour éviter deux trajets en cours lors de clics simultanés. Les écritures GPS mettent à jour seulement un trajet toujours actif et ne recréent pas un trajet supprimé. Lorsque le navigateur prend en charge Web Locks, un verrou évite deux mesures simultanées dans plusieurs fenêtres ; pour les navigateurs sans ce mécanisme, et plus généralement pour éviter les conflits, utiliser **une seule fenêtre** pendant le suivi.

## Déclenchement Bluetooth ou NFC — étudié, non réalisé

### NFC : piste adaptée à un essai futur, mais pas en arrière-plan

Web NFC sur Android/Chrome peut lire des tags **NDEF** lorsque le matériel et le navigateur sont compatibles. Il nécessite un contexte sécurisé, une page principale visible, une action utilisateur et un téléphone déverrouillé. La simple présence de l’API ne prouve pas que le matériel NFC est activé ; un numéro de série peut être vide. Le scan ne démarre pas universellement l’application fermée ou écran verrouillé. [1](https://developer.chrome.com/docs/capabilities/nfc)

Piste possible **à valider avant développement** : ouvrir VigieAuto, activer un scan, puis approcher un badge préalablement associé à un véhicule pour proposer le départ manuel ou GPS. Un identifiant enregistré dans le contenu NDEF pourrait être utilisé si le matériel l’accepte ; les tags peuvent être copiés et ne constituent pas une authentification forte. Il faudrait décider comment associer le badge, quoi faire à la deuxième lecture et si le tag est fourni/inscriptible. Ne jamais écrire sur un badge sans accord explicite.

### Bluetooth : plus limité qu’une connexion à n’importe quel autoradio

Web Bluetooth concerne les périphériques **Bluetooth Low Energy**, avec un choix/une autorisation de périphérique, et n’est pas disponible dans les service workers. Il ne garantit pas la détection silencieuse de la connexion Bluetooth classique d’un autoradio, ni le réveil d’une PWA fermée. [1](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)

Une option native ou hybride Android pourrait être étudiée si l’utilisateur l’accepte, après identification du téléphone, du véhicule et du matériel ; elle imposerait permissions, notification de service et restrictions Android selon le cas. Un démarrage universel sans interaction ne doit pas être promis. [1](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start)

## Autres idées, pas encore réalisées

- Filtres avancés, trajets récurrents et questions facultatives sur la charge ou la climatisation. Le score éco n’est pas arbitré et exigerait une méthode explicite et vérifiée.
- Export PDF d’entretien, rappel de sauvegarde, sauvegarde automatique dans un dossier ou Google Drive personnel : à concevoir avec consentement et secours manuel. Chrome Android propose certaines API de fichiers, mais une permission peut devoir être redemandée. [1](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access) Un dossier local n’est pas automatiquement synchronisé dans Drive. [1](https://support.google.com/drive/answer/2424368?hl=en&co=GENIE.Platform%3DAndroid)

Le GPS seul ne mesure ni la santé de l’EGR ou des injecteurs, ni la consommation exacte d’un trajet ; il n’identifie pas une panne. Un arrêt peut être un feu ou un embouteillage, pas nécessairement une arrivée. Il n’existe pas de consigne universelle de « décrassage » à 4 000 tr/min : se référer au constructeur ou à un professionnel.

Les données et exports JSON sont locaux et **non chiffrés**. La perte du téléphone ou l’effacement du navigateur peut supprimer le carnet : conservez régulièrement une copie dans un autre endroit sûr et testez sa restauration. Un téléchargement commencé ne prouve pas que cette copie existe.
