import {useTranslation} from 'react-i18next';
import {detectBrowser} from '@/lib/location';

const stepsKey = {
  ios: 'location.stepsIos',
  android: 'location.stepsAndroid',
  firefox: 'location.stepsFirefox',
  safari: 'location.stepsSafari',
  desktop: 'location.stepsDesktop',
} as const;

// How to re-allow a blocked location for the user's browser. A site cannot
// show the browser's permission prompt again once it is blocked.
export default function LocationSteps({className = ''}: {className?: string}) {
  const {t} = useTranslation();
  const steps = t(stepsKey[detectBrowser()], {returnObjects: true}) as string[];
  return (
    <ol
      className={`list-decimal space-y-1.5 rounded-xl bg-slate-50 p-3 pl-8 text-left text-slate-700 ${className}`}>
      {steps.map(step => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  );
}
