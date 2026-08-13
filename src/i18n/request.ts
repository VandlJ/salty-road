import {getRequestConfig} from 'next-intl/server';
import {hasLocale} from 'next-intl';
import {routing} from './routing';

export default getRequestConfig(async ({requestLocale}) => {
  // This typically corresponds to the `[locale]` segment
  const requested = await requestLocale;

  // hasLocale is a type guard, so this both validates an unknown incoming
  // segment and narrows it to the Locale union — an `includes(x as Locale)`
  // check would validate but leave the type as `string`.
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
