class MusicPlayer {
    constructor() {
        this.audio = new Audio();
        this.currentSong = null;
        this.isPlaying = false;
        this.progress = 0;
        this.volume = 0.5;
        
        // API基础URL
        this.apiBaseUrl = 'http://localhost:3000'; // 假设API运行在本地3000端口
        
        this.init();
    }

    async init() {
        try {
            // 初始化音频事件监听
            this.setupAudioEvents();
            // 初始化UI事件监听
            this.setupEventListeners();
            // 获取并加载推荐歌曲
            await this.loadRecommendation();
        } catch (error) {
            console.error('初始化播放器失败:', error);
        }
    }

    async loadRecommendation() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/personalized/newsong`);
            const data = await response.json();
            if (data.result && data.result.length > 0) {
                // 随机选择一首歌
                const randomIndex = Math.floor(Math.random() * data.result.length);
                const song = data.result[randomIndex];
                await this.loadSong(song.id);
            }
        } catch (error) {
            console.error('获取推荐歌曲失败:', error);
        }
    }

    async loadSong(songId) {
        try {
            // 获取歌曲详情
            const detailResponse = await fetch(`${this.apiBaseUrl}/song/detail?ids=${songId}`);
            const detailData = await detailResponse.json();
            
            // 获取歌曲URL
            const urlResponse = await fetch(`${this.apiBaseUrl}/song/url/v1?id=${songId}&level=standard`);
            const urlData = await urlResponse.json();

            if (detailData.songs && detailData.songs[0] && urlData.data && urlData.data[0]) {
                const songDetail = detailData.songs[0];
                const songUrl = urlData.data[0].url;

                this.currentSong = {
                    id: songId,
                    title: songDetail.name,
                    artist: songDetail.ar.map(a => a.name).join(', '),
                    cover: songDetail.al.picUrl,
                    duration: songDetail.dt / 1000, // 转换为秒
                    url: songUrl
                };

                this.updateUI();
                this.audio.src = this.currentSong.url;
            }
        } catch (error) {
            console.error('加载歌曲失败:', error);
        }
    }

    updateUI() {
        // 更新主界面
        document.getElementById('songTitle').textContent = this.currentSong.title;
        document.getElementById('artistName').textContent = this.currentSong.artist;
        document.getElementById('songCover').src = this.currentSong.cover;

        // 更新迷你播放器
        document.getElementById('miniTitle').textContent = this.currentSong.title;
        document.getElementById('miniArtist').textContent = this.currentSong.artist;
        document.getElementById('miniCover').src = this.currentSong.cover;

        // 更新时间显示
        document.querySelector('.total-time').textContent = this.formatTime(this.currentSong.duration);
    }

    setupAudioEvents() {
        // 时间更新事件
        this.audio.addEventListener('timeupdate', () => {
            const currentTime = this.audio.currentTime;
            const duration = this.audio.duration;
            this.progress = (currentTime / duration) * 100;
            
            // 更新进度条
            document.querySelector('.progress').style.width = `${this.progress}%`;
            // 更新当前时间显示
            document.querySelector('.current-time').textContent = this.formatTime(currentTime);
        });

        // 播放结束事件
        this.audio.addEventListener('ended', () => {
            this.isPlaying = false;
            this.updatePlayButton();
            // 可以在这里实现自动播放下一首
        });

        // 设置音量
        this.audio.volume = this.volume;
    }

    setupEventListeners() {
        // 播放/暂停按钮
        const playButton = document.getElementById('playButton');
        playButton.addEventListener('click', () => this.togglePlay());

        // 进度条点击
        const progressTrack = document.querySelector('.progress-track');
        progressTrack.addEventListener('click', (e) => {
            const rect = progressTrack.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            this.audio.currentTime = percent * this.audio.duration;
        });

        // 音量控制
        const volumeSlider = document.querySelector('.volume-slider');
        volumeSlider.addEventListener('click', (e) => {
            const rect = volumeSlider.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            this.setVolume(percent);
        });

        // 音量按钮
        const volumeBtn = document.querySelector('.volume-btn');
        volumeBtn.addEventListener('click', () => this.toggleMute());
    }

    togglePlay() {
        if (this.audio.paused) {
            this.audio.play();
            this.isPlaying = true;
        } else {
            this.audio.pause();
            this.isPlaying = false;
        }
        this.updatePlayButton();
    }

    updatePlayButton() {
        const playButton = document.getElementById('playButton');
        playButton.innerHTML = this.isPlaying ? 
            '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2.7 1a.7.7 0 00-.7.7v12.6a.7.7 0 00.7.7h2.6a.7.7 0 00.7-.7V1.7a.7.7 0 00-.7-.7H2.7zm8 0a.7.7 0 00-.7.7v12.6a.7.7 0 00.7.7h2.6a.7.7 0 00.7-.7V1.7a.7.7 0 00-.7-.7h-2.6z"/></svg>' :
            '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 1.713a.7.7 0 011.05-.607l10.89 6.288a.7.7 0 010 1.212L4.05 14.894A.7.7 0 013 14.288V1.713z"/></svg>';
    }

    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
        this.audio.volume = this.volume;
        document.querySelector('.volume-level').style.width = `${this.volume * 100}%`;
    }

    toggleMute() {
        if (this.audio.volume > 0) {
            this.audio.volume = 0;
            document.querySelector('.volume-level').style.width = '0%';
        } else {
            this.audio.volume = this.volume;
            document.querySelector('.volume-level').style.width = `${this.volume * 100}%`;
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}

// 初始化播放器
const player = new MusicPlayer(); 