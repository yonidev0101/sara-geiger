import type { Metadata } from 'next';
import { firstName, nameLetters, sectionRef } from '@/lib/letters';
import { site } from '@/lib/site';
import { getSegmentVerses, TEXT_CREDIT } from '@/lib/text';
import { LettersReader, type LetterSection } from './LettersReader';

export const metadata: Metadata = {
  title: 'פרק קי״ט לפי אותיות השם',
  description: 'פסוקי פרק קי״ט לפי אותיות השם ואותיות נשמה, כמנהג ביארצייט ובקבר.',
};

const NESHAMA = ['נ', 'ש', 'מ', 'ה'];

export default async function LettersPage({ searchParams }: { searchParams: Promise<{ name?: string; for?: string; n?: string }> }) {
  const { name: raw, for: back, n } = await searchParams;
  const name = (raw ?? firstName(site.honoree)).trim().slice(0, 40);
  const build = (letters: string[]): LetterSection[] =>
    letters.map((letter) => ({ letter, verses: getSegmentVerses(sectionRef(letter), 0) }));
  return (
    <LettersReader
      name={name}
      nameSections={build(nameLetters(name))}
      neshamaSections={build(NESHAMA)}
      back={back && /^[a-z0-9]{4,12}$/.test(back) ? `/c/${back}` : '/tehillim'}
      credit={TEXT_CREDIT}
      withNeshama={n !== '0'}
    />
  );
}
