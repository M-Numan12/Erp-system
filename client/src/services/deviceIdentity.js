const KEY = 'erp_device_id_v1';

export const getDeviceId = () => {
  let id = localStorage.getItem(KEY);
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    if (!globalThis.crypto?.randomUUID) throw new Error('Secure device identity requires HTTPS');
    id = globalThis.crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
};
