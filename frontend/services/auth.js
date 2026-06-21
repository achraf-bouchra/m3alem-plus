import API from "./api";

export const login = async (email, password, role) => {
  const payload = {
    email: email.trim().toLowerCase(),
    password,
    role,
  };
  console.log("[LOGIN REQUEST]", { email: payload.email, role: payload.role, hasPassword: Boolean(payload.password) });
  const res = await API.post("/login/", {
    email: payload.email,
    password: payload.password,
    role: payload.role,
  });

  return res.data;
};
