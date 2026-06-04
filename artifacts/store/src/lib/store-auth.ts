import { setAuthTokenGetter } from "@workspace/api-client-react";

export function initStoreAuth() {
  setAuthTokenGetter(() => localStorage.getItem("store_token"));
}
