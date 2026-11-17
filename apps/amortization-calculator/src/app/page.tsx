import { redirect } from 'next/navigation';

/** `/` has no content of its own; the Amortization Calculator is the default page (spec 003 FR-001). */
export default function Home() {
  redirect('/amortization');
}
