import { site } from './site';
import type { DedicationKind } from './types';

type Dedication = { kind: DedicationKind; name: string } | null | undefined;

/** "שרה בת צבי" is female, "משה בן רחל" is male. Names without either default to female. */
function isMale(name: string): boolean {
  return /(^|\s)בן(\s|$)/.test(name) && !/(^|\s)בת(\s|$)/.test(name);
}

function resolve(d: Dedication): { kind: DedicationKind; name: string } {
  return d?.name ? d : { kind: 'ilui', name: site.honoree };
}

const PURPOSE: Record<DedicationKind, string> = {
  ilui: 'לְעִלּוּי נִשְׁמַת',
  refua: 'לִרְפוּאַת',
  hatzlacha: 'לְהַצְלָחַת',
};

/** A short intention to say before reading. */
export function prayerBefore(d: Dedication): string {
  const { kind, name } = resolve(d);
  return `הֲרֵינִי מְכַוֵּן לוֹמַר פִּרְקֵי תְּהִלִּים אֵלּוּ ${PURPOSE[kind]} ${name}.`;
}

/** The "יהי רצון" after reading, with the name in place. */
export function prayerAfter(d: Dedication): string {
  const { kind, name } = resolve(d);
  const male = isMale(name);
  const opening = 'יְהִי רָצוֹן מִלְּפָנֶיךָ ה׳ אֱלֹהֵינוּ וֵאלֹהֵי אֲבוֹתֵינוּ,';
  switch (kind) {
    case 'ilui':
      return `${opening} שֶׁתְּהֵא קְרִיאַת פִּרְקֵי תְּהִלִּים אֵלּוּ לְעִלּוּי נִשְׁמַת ${name}, וּתְהֵא ${male ? 'נִשְׁמָתוֹ' : 'נִשְׁמָתָהּ'} צְרוּרָה בִּצְרוֹר הַחַיִּים. אָמֵן.`;
    case 'refua':
      return `${opening} שֶׁבִּזְכוּת קְרִיאַת פִּרְקֵי תְּהִלִּים אֵלּוּ תִּשְׁלַח מְהֵרָה רְפוּאָה שְׁלֵמָה מִן הַשָּׁמַיִם, רְפוּאַת הַנֶּפֶשׁ וּרְפוּאַת הַגּוּף, לְ${name} בְּתוֹךְ שְׁאָר חוֹלֵי יִשְׂרָאֵל. אָמֵן.`;
    case 'hatzlacha':
      return `${opening} שֶׁבִּזְכוּת קְרִיאַת פִּרְקֵי תְּהִלִּים אֵלּוּ תִּשְׁלַח בְּרָכָה וְהַצְלָחָה בְּכָל מַעֲשֵׂה ${male ? 'יָדָיו' : 'יָדֶיהָ'} שֶׁל ${name}. אָמֵן.`;
  }
}
