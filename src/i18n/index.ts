import type { LangPref } from '../data/db';

/**
 * Localization from day one — PRD §25.
 *
 * Greek is the reference dictionary; every other language must supply the same
 * keys or fail to compile. Station names are NOT translated: canonical Greek
 * branding is preserved and only the interface around it moves (§25).
 */

const el = {
  'app.name': 'OpenRadio',
  'app.tagline': 'Άνοιξε. Πάτα. Άκου.',

  'nav.home': 'Αρχική',
  'nav.discover': 'Ανακάλυψε',
  'nav.myRadio': 'Το ραδιόφωνό μου',

  'home.forNow': 'Τώρα',
  'home.recent': 'Πρόσφατα',
  'home.yours': 'Οι σταθμοί σου',
  'home.popular': 'Δημοφιλή',
  'home.reason.timeOfDay': 'Συνήθως ακούς αυτή την ώρα',
  'home.reason.weekday': 'Συνήθως ακούς αυτή τη μέρα',
  'home.reason.mostPlayed': 'Ο σταθμός που ακούς πιο πολύ',
  'home.seeAll': 'Όλα',
  'home.greeting.night': 'Είναι βράδυ στην Ελλάδα',
  'home.greeting.dawn': 'Ξημερώνει στην Ελλάδα',
  'home.greeting.morning': 'Καλημέρα από την Ελλάδα',
  'home.greeting.midday': 'Μεσημέρι, ήλιος στην Ελλάδα',
  'home.greeting.afternoon': 'Απόγευμα στην Ελλάδα',
  'home.greeting.sunset': 'Δύει ο ήλιος στην Ελλάδα',

  'discover.title': 'Ανακάλυψε',
  'discover.byLocation': 'Ανά πόλη',
  'discover.stations': 'σταθμοί',

  'genre.greek-pop': 'Ελληνικά',
  'genre.laiko': 'Λαϊκά',
  'genre.entekhno': 'Έντεχνα',
  'genre.retro': "80s / 90s",
  'genre.international': 'Ξένα',
  'genre.news-talk': 'Ειδήσεις',
  'genre.sport': 'Αθλητικά',
  'genre.popular': 'Δημοφιλή',

  'search.open': 'Αναζήτηση σταθμών',
  'search.label': 'Αναζήτηση σταθμών',
  'search.placeholder': 'Σταθμός, συχνότητα, πόλη',
  'search.close': 'Κλείσιμο αναζήτησης',
  'search.clear': 'Καθαρισμός',
  'search.recent': 'Πρόσφατες αναζητήσεις',
  'search.results': 'σταθμοί',
  'search.none': 'Κανένα αποτέλεσμα',
  'search.noneHint': 'Δοκίμασε έναν από αυτούς',
  'search.matched': 'βρέθηκε ως',

  'myRadio.title': 'Το ραδιόφωνό μου',
  'myRadio.favorites': 'Αγαπημένα',
  'myRadio.history': 'Ιστορικό',
  'myRadio.settings': 'Ρυθμίσεις',
  'myRadio.edit': 'Επεξεργασία',
  'myRadio.done': 'Τέλος',
  'myRadio.clearHistory': 'Καθαρισμός ιστορικού',
  'myRadio.noFavorites': 'Δεν έχεις αγαπημένα ακόμα.',
  'myRadio.noHistory': 'Δεν έχεις ακούσει κάτι ακόμα.',
  'myRadio.moveUp': 'Μετακίνηση πάνω',
  'myRadio.moveDown': 'Μετακίνηση κάτω',
  'myRadio.position': 'θέση',
  'myRadio.noAds': 'Καμία διαφήμιση δεν προστίθεται από εμάς.',

  'settings.theme': 'Θέμα',
  'settings.theme.system': 'Συστήματος',
  'settings.theme.light': 'Φωτεινό',
  'settings.theme.dark': 'Σκοτεινό',
  'settings.language': 'Γλώσσα',
  'settings.diagnostics': 'Διαγνωστικά',

  'player.play': 'Αναπαραγωγή',
  'player.pause': 'Παύση',
  'player.prev': 'Προηγούμενος σταθμός',
  'player.next': 'Επόμενος σταθμός',
  'player.favorite': 'Προσθήκη στα αγαπημένα',
  'player.unfavorite': 'Αφαίρεση από τα αγαπημένα',
  'player.timer': 'Χρονοδιακόπτης',
  'player.share': 'Κοινοποίηση',
  'player.open': 'Άνοιγμα αναπαραγωγής',
  'player.close': 'Κλείσιμο',
  'player.live': 'ΖΩΝΤΑΝΑ',
  'player.playing': 'Παίζει',
  'player.connecting': 'Σύνδεση…',
  'player.paused': 'Σε παύση',
  'player.unavailable': 'Ο σταθμός δεν είναι διαθέσιμος αυτή τη στιγμή.',
  'player.unavailableShort': 'Μη διαθέσιμος',
  'player.tryAgain': 'Δοκίμασε ξανά',
  'player.tryInstead': 'Δοκίμασε αντ’ αυτού',
  'player.from': 'Από',
  'player.queue.favorites': 'Αγαπημένα',
  'player.queue.popular': 'Δημοφιλή',
  'player.queue.recent': 'Πρόσφατα',
  'player.queue.search': 'αναζήτηση',

  'timer.title': 'Χρονοδιακόπτης ύπνου',
  'timer.off': 'Ανενεργός',
  'timer.min': 'λεπτά',
  'timer.left': 'λεπτά ακόμα',

  'offline.title': 'Είσαι εκτός σύνδεσης.',
  'offline.body': 'Οι σταθμοί σου είναι εδώ. Συνδέσου ξανά για να ακούσεις.',
  'offline.short': 'Χωρίς σύνδεση στο διαδίκτυο.',

  'install.title': 'Πρόσθεσέ το στην αρχική οθόνη',
  'install.body': 'Ανοίγει σαν εφαρμογή. Δεν χρειάζεται λογαριασμός.',
  'install.action': 'Εγκατάσταση',
  'install.dismiss': 'Όχι τώρα',
  'install.ios.body': 'Πάτησε Κοινοποίηση, μετά «Προσθήκη στην Αρχική οθόνη».',
  'install.ios.action': 'Κατάλαβα',

  'time.today': 'σήμερα',
  'time.yesterday': 'χθες',

  'catalog.stale': 'Εμφανίζονται αποθηκευμένοι σταθμοί.',
  'catalog.error': 'Ο κατάλογος δεν φορτώθηκε.',
} as const;

export type MessageKey = keyof typeof el;
type Dict = Record<MessageKey, string>;

const en: Dict = {
  'app.name': 'OpenRadio',
  'app.tagline': 'Open. Tap. Listen.',

  'nav.home': 'Home',
  'nav.discover': 'Discover',
  'nav.myRadio': 'My Radio',

  'home.forNow': 'For now',
  'home.recent': 'Recently played',
  'home.yours': 'Your stations',
  'home.popular': 'Popular now',
  'home.reason.timeOfDay': 'You usually listen around this time',
  'home.reason.weekday': 'You usually listen on this day',
  'home.reason.mostPlayed': 'The station you play most',
  'home.seeAll': 'See all',
  'home.greeting.night': "It's night in Greece",
  'home.greeting.dawn': 'Dawn is breaking in Greece',
  'home.greeting.morning': 'Good morning from Greece',
  'home.greeting.midday': 'High noon in Greece',
  'home.greeting.afternoon': 'Afternoon in Greece',
  'home.greeting.sunset': 'Sunset over Greece',

  'discover.title': 'Discover',
  'discover.byLocation': 'By location',
  'discover.stations': 'stations',

  'genre.greek-pop': 'Greek Pop',
  'genre.laiko': 'Laïko',
  'genre.entekhno': 'Éntekhno',
  'genre.retro': '80s / 90s',
  'genre.international': 'International',
  'genre.news-talk': 'News & Talk',
  'genre.sport': 'Sport',
  'genre.popular': 'Popular',

  'search.open': 'Search stations',
  'search.label': 'Search stations',
  'search.placeholder': 'Station, frequency, city',
  'search.close': 'Close search',
  'search.clear': 'Clear',
  'search.recent': 'Recent searches',
  'search.results': 'stations',
  'search.none': 'Nothing found',
  'search.noneHint': 'Try one of these',
  'search.matched': 'matched',

  'myRadio.title': 'My Radio',
  'myRadio.favorites': 'Favorites',
  'myRadio.history': 'History',
  'myRadio.settings': 'Settings',
  'myRadio.edit': 'Edit',
  'myRadio.done': 'Done',
  'myRadio.clearHistory': 'Clear history',
  'myRadio.noFavorites': 'No favorites yet.',
  'myRadio.noHistory': 'Nothing listened to yet.',
  'myRadio.moveUp': 'Move up',
  'myRadio.moveDown': 'Move down',
  'myRadio.position': 'position',
  'myRadio.noAds': 'No ads added by us.',

  'settings.theme': 'Theme',
  'settings.theme.system': 'System',
  'settings.theme.light': 'Light',
  'settings.theme.dark': 'Dark',
  'settings.language': 'Language',
  'settings.diagnostics': 'Diagnostics',

  'player.play': 'Play',
  'player.pause': 'Pause',
  'player.prev': 'Previous station',
  'player.next': 'Next station',
  'player.favorite': 'Add to favorites',
  'player.unfavorite': 'Remove from favorites',
  'player.timer': 'Timer',
  'player.share': 'Share',
  'player.open': 'Open now playing',
  'player.close': 'Close',
  'player.live': 'LIVE',
  'player.playing': 'Playing',
  'player.connecting': 'Connecting…',
  'player.paused': 'Paused',
  'player.unavailable': 'This station is currently unavailable.',
  'player.unavailableShort': 'Unavailable',
  'player.tryAgain': 'Try again',
  'player.tryInstead': 'Try instead',
  'player.from': 'From',
  'player.queue.favorites': 'Favorites',
  'player.queue.popular': 'Popular',
  'player.queue.recent': 'Recently played',
  'player.queue.search': 'search',

  'timer.title': 'Sleep timer',
  'timer.off': 'Off',
  'timer.min': 'min',
  'timer.left': 'min left',

  'offline.title': "You're offline.",
  'offline.body': 'Your stations are still here. Reconnect to start listening.',
  'offline.short': 'No internet connection.',

  'install.title': 'Add to home screen',
  'install.body': 'Opens like an app. Still no account needed.',
  'install.action': 'Install',
  'install.dismiss': 'Not now',
  'install.ios.body': 'Tap Share, then "Add to Home Screen".',
  'install.ios.action': 'Got it',

  'time.today': 'today',
  'time.yesterday': 'yesterday',

  'catalog.stale': 'Showing your saved station list.',
  'catalog.error': 'The station list could not load.',
};

const de: Dict = {
  'app.name': 'OpenRadio',
  'app.tagline': 'Öffnen. Tippen. Hören.',

  'nav.home': 'Start',
  'nav.discover': 'Entdecken',
  'nav.myRadio': 'Mein Radio',

  'home.forNow': 'Gerade jetzt',
  'home.recent': 'Zuletzt gehört',
  'home.yours': 'Deine Sender',
  'home.popular': 'Beliebt',
  'home.reason.timeOfDay': 'Um diese Zeit hörst du meistens',
  'home.reason.weekday': 'An diesem Tag hörst du meistens',
  'home.reason.mostPlayed': 'Dein meistgehörter Sender',
  'home.seeAll': 'Alle',
  'home.greeting.night': 'In Griechenland ist es Nacht',
  'home.greeting.dawn': 'In Griechenland dämmert es',
  'home.greeting.morning': 'Guten Morgen aus Griechenland',
  'home.greeting.midday': 'Mittagssonne in Griechenland',
  'home.greeting.afternoon': 'Nachmittag in Griechenland',
  'home.greeting.sunset': 'Sonnenuntergang in Griechenland',

  'discover.title': 'Entdecken',
  'discover.byLocation': 'Nach Stadt',
  'discover.stations': 'Sender',

  'genre.greek-pop': 'Griechischer Pop',
  'genre.laiko': 'Laïko',
  'genre.entekhno': 'Éntechno',
  'genre.retro': '80er / 90er',
  'genre.international': 'International',
  'genre.news-talk': 'Nachrichten',
  'genre.sport': 'Sport',
  'genre.popular': 'Beliebt',

  'search.open': 'Sender suchen',
  'search.label': 'Sender suchen',
  'search.placeholder': 'Sender, Frequenz, Stadt',
  'search.close': 'Suche schließen',
  'search.clear': 'Löschen',
  'search.recent': 'Letzte Suchen',
  'search.results': 'Sender',
  'search.none': 'Nichts gefunden',
  'search.noneHint': 'Probier einen davon',
  'search.matched': 'gefunden als',

  'myRadio.title': 'Mein Radio',
  'myRadio.favorites': 'Favoriten',
  'myRadio.history': 'Verlauf',
  'myRadio.settings': 'Einstellungen',
  'myRadio.edit': 'Bearbeiten',
  'myRadio.done': 'Fertig',
  'myRadio.clearHistory': 'Verlauf löschen',
  'myRadio.noFavorites': 'Noch keine Favoriten.',
  'myRadio.noHistory': 'Noch nichts gehört.',
  'myRadio.moveUp': 'Nach oben',
  'myRadio.moveDown': 'Nach unten',
  'myRadio.position': 'Position',
  'myRadio.noAds': 'Von uns kommt keine Werbung dazu.',

  'settings.theme': 'Design',
  'settings.theme.system': 'System',
  'settings.theme.light': 'Hell',
  'settings.theme.dark': 'Dunkel',
  'settings.language': 'Sprache',
  'settings.diagnostics': 'Diagnose',

  'player.play': 'Abspielen',
  'player.pause': 'Pause',
  'player.prev': 'Vorheriger Sender',
  'player.next': 'Nächster Sender',
  'player.favorite': 'Zu Favoriten hinzufügen',
  'player.unfavorite': 'Aus Favoriten entfernen',
  'player.timer': 'Timer',
  'player.share': 'Teilen',
  'player.open': 'Wiedergabe öffnen',
  'player.close': 'Schließen',
  'player.live': 'LIVE',
  'player.playing': 'Läuft',
  'player.connecting': 'Verbinden…',
  'player.paused': 'Pausiert',
  'player.unavailable': 'Dieser Sender ist derzeit nicht verfügbar.',
  'player.unavailableShort': 'Nicht verfügbar',
  'player.tryAgain': 'Erneut versuchen',
  'player.tryInstead': 'Stattdessen',
  'player.from': 'Aus',
  'player.queue.favorites': 'Favoriten',
  'player.queue.popular': 'Beliebt',
  'player.queue.recent': 'Zuletzt gehört',
  'player.queue.search': 'Suche',

  'timer.title': 'Sleep-Timer',
  'timer.off': 'Aus',
  'timer.min': 'Min',
  'timer.left': 'Min übrig',

  'offline.title': 'Du bist offline.',
  'offline.body': 'Deine Sender sind noch da. Verbinde dich, um zu hören.',
  'offline.short': 'Keine Internetverbindung.',

  'install.title': 'Zum Startbildschirm',
  'install.body': 'Öffnet wie eine App. Weiterhin ohne Konto.',
  'install.action': 'Installieren',
  'install.dismiss': 'Später',
  'install.ios.body': 'Tippe auf Teilen, dann „Zum Home-Bildschirm“.',
  'install.ios.action': 'Verstanden',

  'time.today': 'heute',
  'time.yesterday': 'gestern',

  'catalog.stale': 'Gespeicherte Senderliste wird angezeigt.',
  'catalog.error': 'Die Senderliste konnte nicht geladen werden.',
};

const DICTS: Record<LangPref, Dict> = { el, en, de };

export function translator(lang: LangPref) {
  const dict = DICTS[lang] ?? en;
  return (key: MessageKey): string => dict[key] ?? en[key];
}

/** BCP-47 tag for `lang` attributes and Intl. */
export const localeOf: Record<LangPref, string> = { el: 'el-GR', en: 'en-GB', de: 'de-DE' };

export function relativeDay(at: number, lang: LangPref, t: (k: MessageKey) => string): string {
  const now = new Date();
  const then = new Date(at);
  const days = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime()) /
      86_400_000,
  );
  if (days <= 0) return t('time.today');
  if (days === 1) return t('time.yesterday');
  if (days < 7) return then.toLocaleDateString(localeOf[lang], { weekday: 'long' });
  return then.toLocaleDateString(localeOf[lang], { day: 'numeric', month: 'short' });
}
