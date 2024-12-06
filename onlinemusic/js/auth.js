class Auth {
    constructor() {
        this.isLoggedIn = false;
        this.init();
    }

    init() {
        // 检查本地存储中是否有登录令牌
        const token = localStorage.getItem('userToken');
        if (token) {
            this.isLoggedIn = true;
            this.updateUI();
        }

        // 添加头像点击事件
        document.getElementById('userAvatar').addEventListener('click', () => {
            if (this.isLoggedIn) {
                window.location.href = '/profile.html';
            } else {
                this.showLoginModal();
            }
        });
    }

    showLoginModal() {
        // 创建登录模态框
        const modal = document.createElement('div');
        modal.className = 'login-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>登录</h2>
                <form id="loginForm">
                    <input type="text" placeholder="用户名" required>
                    <input type="password" placeholder="密码" required>
                    <button type="submit">登录</button>
                    <p>还没有账号？<a href="#" id="showRegister">立即注册</a></p>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    }

    updateUI() {
        // 更新用户头像和界面显示
        const avatar = document.getElementById('userAvatar');
        if (this.isLoggedIn) {
            // 获取用户信息并更新头像
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            if (userInfo && userInfo.avatar) {
                avatar.querySelector('img').src = userInfo.avatar;
            }
        }
    }
}

// 初始化认证
const auth = new Auth(); 