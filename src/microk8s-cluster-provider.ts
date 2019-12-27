import * as k8s from 'vscode-kubernetes-tools-api';
import * as shelljs from 'shelljs';
import { ChildProcess } from 'child_process';

const MICROK8S_CLUSTER_PROVIDER_ID = 'microk8s';

export const MICROK8S_CLUSTER_PROVIDER: k8s.ClusterProviderV1.ClusterProvider = {
    id: MICROK8S_CLUSTER_PROVIDER_ID,
    displayName: 'MicroK8s',
    supportedActions: ['create'],
    next: onNext
};

const PAGE_SETTINGS = 'settings';

const SETTING_CHANNEL_NAME = 'clustername';

function onNext(wizard: k8s.ClusterProviderV1.Wizard, _action: k8s.ClusterProviderV1.ClusterProviderAction, message: any): void {
    wizard.showPage("<h1>Please wait...</h1>");
    const sendingStep: string = message[k8s.ClusterProviderV1.SENDING_STEP_KEY];
    const htmlPromise = getPage(sendingStep, message);
    wizard.showPage(htmlPromise);
}

function getPage(sendingStep: string, previousData: any): k8s.ClusterProviderV1.Sequence<string> {
    switch (sendingStep) {
        case k8s.ClusterProviderV1.SELECT_CLUSTER_TYPE_STEP_ID:
            return collectSettings(previousData);
        case PAGE_SETTINGS:
            return createCluster(previousData);
        default:
            return "Internal error";
    }
}

function collectSettings(previousData: any): string {
    const inputSettings = [
        `<p>Channel name: <input type='text' name='${SETTING_CHANNEL_NAME}' value='latest/stable' /></p>`,
        // TODO: Get the available channels shown in snap info microk8s.
    ];
    const html = formPage(
        PAGE_SETTINGS,
        "Cluster Settings",
        inputSettings.join('\n'),
        "Create",
        previousData);
    return html;
}

function createCluster(previousData: any): k8s.ClusterProviderV1.Observable<string> {
    return {
        subscribe(observer: k8s.ClusterProviderV1.Observer<string>): void {
            observer.onNext("<h1>Creating local MicroK8s cluster - please wait</h1>");
            let stdout = '';
            let stderr = '';
            let resultPara = '';
            let title = 'Creating local MicroK8s cluster - please wait';
            function html() {
                return `<h1>${title}</h1>${paragraphise(stdout)}${paragraphise(stderr, 'red')}${resultPara}`;
            }
            const channelName: string = previousData[SETTING_CHANNEL_NAME];
            const childProcess = shelljs.exec(`snap install microk8s --classic --channel ${channelName}`, { async: true }) as ChildProcess;
            childProcess.stdout.on('data', (chunk: string) => {
                stdout += chunk;
                observer.onNext(html());
            });
            childProcess.stderr.on('data', (chunk: string) => {
                stderr += chunk;
                observer.onNext(html());
            });
            childProcess.on('error', (err: Error) => {
                stderr += err.message;
                observer.onNext(html());
            });
            childProcess.on('exit', (code: number) => {
                if (code === 0) {
                    title = 'Cluster created';
                    resultPara = `<p style='font-weight: bold; color: lightgreen'>Your local cluster has been created.</p>`;
                    observer.onNext(html());
                } else {
                    title = 'Cluster creation failed';
                    resultPara = `<p style='font-weight: bold; color: red'>Your local cluster was not created. See tool output above for why.</p>`;
                    observer.onNext(html());
                }
            });
        }
    };
}

function formPage(stepId: string, title: string, body: string, buttonCaption: string | null, previousData: any): string {
    const buttonHtml = buttonCaption ? `<button onclick='${k8s.ClusterProviderV1.NEXT_PAGE}'>${buttonCaption}</button>` : '';
    const previousDataFields = Object.keys(previousData)
                                     .filter((k) => k !== k8s.ClusterProviderV1.SENDING_STEP_KEY)
                                     .map((k) => `<input type='hidden' name='${k}' value='${previousData[k]}' />`)
                                     .join('\n');
    const html = `<h1>${title}</h1>
    <form id="${k8s.ClusterProviderV1.WIZARD_FORM_NAME}">
        <input type='hidden' name='${k8s.ClusterProviderV1.SENDING_STEP_KEY}' value='${stepId}' />
        ${previousDataFields}
        ${body}
        <p>${buttonHtml}</p>
    </form>
    `;

    return html;
}

function paragraphise(text: string, colour?: string): string {
    const colourAttr = colour ? ` style='color:${colour}'` : '';
    const lines = text.split('\n').map((l) => l.trim());
    const paras = lines.map((l) => `<p${colourAttr}>${l}</p>`);
    return paras.join('\n');
}