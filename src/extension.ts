import * as vscode from 'vscode';
import * as k8s from 'vscode-kubernetes-tools-api';

import { MICROK8S_CLOUD_PROVIDER } from './microk8s-cloud-provider';
import { MICROK8S_CLUSTER_PROVIDER } from './microk8s-cluster-provider';

export async function activate(_context: vscode.ExtensionContext) {
    const cloudExplorer = await k8s.extension.cloudExplorer.v1;
    if (cloudExplorer.available) {
        cloudExplorer.api.registerCloudProvider(MICROK8S_CLOUD_PROVIDER);
    } else {
        vscode.window.showErrorMessage("Can't register MicroK8s cloud provider: " + cloudExplorer.reason);
    }

    const clusterProvider = await k8s.extension.clusterProvider.v1;
    if (clusterProvider.available) {
        clusterProvider.api.register(MICROK8S_CLUSTER_PROVIDER);
    } else {
        vscode.window.showErrorMessage("Can't register MicroK8s cluster provider: " + clusterProvider.reason);
    }

    // const disposables = [];

	// context.subscriptions.push(...disposables);
}
