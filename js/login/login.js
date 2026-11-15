const roleOptions = Array.from(document.querySelectorAll("[data-role]"));
const lineLogin = document.querySelector(".line-login");
const statusMessage = document.querySelector("#login-status");
let selectedRole = "";

window.CommunityAuth.initialize("login").then(() => {
  const result = window.CommunityAuth.callbackResult();
  if (result === "failed") statusMessage.textContent = "登入未完成，請再試一次。";
  if (result === "invalid") statusMessage.textContent = "無法確認登入身分，請重新選擇身分登入。";
}).catch(() => {
  statusMessage.textContent = "目前無法連線到登入服務，請稍後再試。";
});

roleOptions.forEach((option) => {
  option.addEventListener("click", () => {
    selectedRole = option.dataset.role;
    roleOptions.forEach((item) => {
      item.setAttribute("aria-pressed", String(item === option));
    });
    const roleName = selectedRole === "resident" ? "住戶" : "工作人員";
    statusMessage.textContent = `已選擇「${roleName}」，請使用通訊軟體繼續。`;
  });
});

lineLogin.addEventListener("click", () => {
  if (!selectedRole) {
    statusMessage.textContent = "請先選擇住戶或工作人員身分。";
    roleOptions[0].focus();
    return;
  }
  try {
    const loginUrl = window.CommunityApi.getLineLoginUrl(selectedRole);
    statusMessage.textContent = "正在前往登入服務…";
    window.location.assign(loginUrl);
  } catch (error) {
    statusMessage.textContent = "登入服務設定不完整，請稍後再試。";
  }
});
