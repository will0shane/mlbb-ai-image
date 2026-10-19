/**
 * React 19 Compatibility Polyfill
 *
 * In React 19, __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED was renamed to
 * __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.
 * Libraries compiled against React 18 (such as react-reconciler / @shopify/react-native-skia)
 * expect React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner.
 *
 * This polyfill provides backward compatibility so that Expo Go and React 19
 * can execute without TypeError: Cannot read property 'ReactCurrentOwner' of undefined.
 */
import React from "react";

const reactAny = React as any;
const clientInternals =
  reactAny.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE || {};

if (!reactAny.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
  reactAny.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = new Proxy(clientInternals, {
    get(target: any, prop: string | symbol) {
      if (prop === "ReactCurrentOwner") {
        return target.A || target.ReactCurrentOwner || { current: null };
      }
      if (prop === "ReactCurrentDispatcher") {
        return target.H || target.ReactCurrentDispatcher || { current: null };
      }
      if (prop === "ReactCurrentBatchConfig") {
        return target.T || target.ReactCurrentBatchConfig || { transition: null };
      }
      if (prop === "ReactCurrentActQueue") {
        return target.actQueue || target.ReactCurrentActQueue || { current: null };
      }
      if (prop === "ReactDebugCurrentFrame") {
        return target.ReactDebugCurrentFrame || { getStackAddendum: () => "" };
      }
      return target[prop] !== undefined ? target[prop] : { current: null };
    },
  });
}

// Make sure global.__SECRET_INTERNALS is also set if required directly
if (typeof globalThis !== "undefined") {
  const g = globalThis as any;
  if (!g.React) g.React = React;
}
