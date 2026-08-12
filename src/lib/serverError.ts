// Maps a server error code (`{ error: "field_too_long" }`) to the i18n key
// that explains it to the user, falling back when the code is unknown.
//
// The point is the return type: with an `as const` map this resolves to the
// union of the map's literal values plus the fallback, so next-intl can still
// verify the key. Indexing the map inline — `t(MAP[json?.error] ?? "generic")`
// — widens to `string`, which silently opts that call out of key checking.
//
// Each caller keeps its own map, since the keys live in different namespaces.
export function serverErrorToKey<
  const M extends Record<string, string>,
  const F extends string,
>(map: M, code: unknown, fallback: F): M[keyof M] | F {
  if (typeof code === "string" && Object.hasOwn(map, code)) {
    return map[code] as M[keyof M];
  }
  return fallback;
}
