<template>
    <div
        class="sign-in"
        @click="handleAuthClick"
        v-if="isIn ?? (isScriptsLoaded && !isLoggedIn)"
    >
        <!-- <slot name="signIn">
      <el-button size="large" :icon="iconGoogle">
        Войти с помощью Google
      </el-button>
    </slot> -->
        <slot name="signIn">
            <el-button
                size="large"
                @click="handleUploadClick"
            >
                Загрузить файл данных
            </el-button>
        </slot>
    </div>
    <div
        class="sign-out"
        @click="handleSignoutClick"
        v-if="isOut ?? (isScriptsLoaded && isLoggedIn)"
    >
        <slot name="signOut">
            <el-button> Выйти </el-button>
        </slot>
    </div>
    <input
        type="file"
        ref="fileInput"
        style="display: none"
        accept=".txt"
        @change="handleFileChange"
    />
</template>
<style scoped>
.sign-in,
.sign-out {
    display: inline-block;
}
</style>
<script>
import { API_KEY, CLIENT_ID, DISCOVERY_DOC, SCOPES } from '../config';
import Google from '../components/icons/Google.vue';
import { ref, shallowRef } from 'vue';
import { Actions, Plans } from '../services/changings';
import { watchDataChanging } from '../composables/watchers';

let gapi, google;

export default {
    setup() {
        const fileInput = ref(null);
        const handleUploadClick = () => {
            fileInput.value.click();
        };
        return {
            iconGoogle: shallowRef(Google),
            fileInput,
            handleUploadClick,
        };
    },
    props: {
        type: String, // in | out
    },
    data() {
        return {
            tokenClient: undefined,
            gapiInited: false,
            gisInited: false,
        };
    },
    computed: {
        isScriptsLoaded() {
            return this.gapiInited && this.gisInited;
        },
        isLoggedIn() {
            return this.$store.getters.isLoggedIn;
        },
        filesComp() {
            return this.$store.getters.getList('all');
        },
        isIn() {
            return this.type === 'in';
        },
        isOut() {
            return this.type === 'out';
        },
    },
    methods: {
        async handleAuthClick() {
            return;
            this.tokenClient.callback = async resp => {
                console.log('tokenClient.callback');
                if (resp.error !== undefined) {
                    throw resp;
                }
                console.log(resp);
                console.log(this.tokenClient);
                window.location.replace('/main');
                this.$store.dispatch('login', {
                    //
                    token: resp.access_token,
                    saved_in: this.$dayjs(),
                    expires_in: resp.expires_in,
                });
            };

            if (gapi.client.getToken() === null) {
                // Prompt the user to select a Google Account and ask for consent to share their data
                // when establishing a new session.
                this.tokenClient.requestAccessToken({ prompt: 'consent' });
            } else {
                // Skip display of account chooser and consent dialog for an existing session.
                this.tokenClient.requestAccessToken({ prompt: '' });
            }
        },
        async handleSignoutClick() {
            console.log('signout');
            this.$confirm('Вы хотите выйти из системы?', '', {
                confirmButtonText: 'Да',
                cancelButtonText: 'Нет',
                type: 'warning',
            })
                .then(() => {
                    this.$store.dispatch('logout');
                    this.$message({
                        type: 'success',
                        message: 'Вышли',
                    });
                })
                .then(() => this.$router.push({ path: '/login' }))
                .catch(() => {
                    this.$message({
                        type: 'info',
                        message: 'Действие отменено',
                    });
                });
            // this.$store.dispatch('logout')
        },
        handleFileChange(event) {
            console.log('handleFileChange');
            const file = event.target.files[0];
            const reader = new FileReader();

            try {
                reader.onload = async () => {
                    const fileContent = reader.result;
                    try {
                        const parsedData = JSON.parse(fileContent);
                        for (const { field, data } of parsedData) {
                            if (
                                !data ||
                                (field === 'config' &&
                                    !(typeof data === 'object' && !Array.isArray(data))) ||
                                (field !== 'config' && !Array.isArray(data))
                            ) {
                                throw new Error('Файл поврежден');
                            }
                        }
                        await this.$store.dispatch('saveDataChanges', parsedData);

                        const plans = new Plans();
                        const changes = plans.checkPlans();
                        await this.$store.dispatch('saveDataChanges', changes);
                        const actions = new Actions();
                        const changesActions = actions.simplifyByDays();
                        await this.$store.dispatch('saveDataChanges', changesActions);
                        watchDataChanging();
                        this.$message({
                            type: 'success',
                            message: 'Сохранено',
                        });
                        this.$store.dispatch('loginLocal');
                        this.$router.push('/main');
                    } catch (error) {
                        console.log(error);
                        notifyWrap(error);
                    }
                };

                reader.readAsText(file);
            } catch (error) {
                console.log(error);
            }
        },

        // ----------- handling of google scripts -----------
        async initializeGapiClient() {
            await gapi.client.init({
                apiKey: API_KEY,
                discoveryDocs: [DISCOVERY_DOC],
            });
            this.gapiInited = true;
        },
        gapiLoaded(e) {
            console.log('yessss gapi');
            gapi = window.gapi;
            gapi.load('client', this.initializeGapiClient);
        },
        gisLoaded() {
            console.log('yessss gsi');
            google = window.google;
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: '',
            });
            this.gisInited = true;
        },
        loadAndHandleScript(src, handle) {
            const script = document.createElement('script');
            script.src = src;
            script.onload = e => {
                handle(e);
            };
            script.setAttribute('async', '');
            script.setAttribute('defer', '');
            document.head.appendChild(script);
        },
    },
    mounted() {
        this.$store.dispatch('logoutLocal');
        // if (!window.gapi) this.loadAndHandleScript('https://apis.google.com/js/api.js', this.gapiLoaded)
        // else this.gapiLoaded()
        // if (!window.google) this.loadAndHandleScript('https://accounts.google.com/gsi/client', this.gisLoaded)
        // else this.gisLoaded()
    },
};
</script>
