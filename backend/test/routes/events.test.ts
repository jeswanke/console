/* Copyright Contributors to the Open Cluster Management project */
import { parseResponseJsonBody } from '../../src/lib/body-parser'
import { aggregateKubeApplications, aggregatSearchAPIApplications } from '../../src/routes/aggregators/applications'
import { pagedSearchQueries } from '../../src/lib/search'
import { initEventsCache } from '../../src/routes/events'
import { request } from '../mock-request'
import nock from 'nock'

/// to get exact nock request body, put bp at line 303 in /backend/node_modules/nock/lib/intercepted_request_router.js
describe(`events Route`, function () {
  it(`should receive events`, async function () {
    nock(process.env.CLUSTER_API_URL).get('/apis').reply(200)

    // initialize events
    initEventsCache(events)

    // setup nocks
    setupNocks()

    // // fill in application cache from resourceCache and search api mocks
    // aggregateKubeApplications()
    // await aggregatSearchAPIApplications(10)

    // NO FILTER
    const res = await request('GET', '/events')
    expect(res.statusCode).toEqual(200)
    expect(JSON.stringify(await parseResponseJsonBody(res))).toEqual(JSON.stringify(responseNoFilter))
  })
})

const events = [
  {
    apiVersion: 'cluster.open-cluster-management.io/v1beta1',
    kind: 'Placement',
    metadata: {
      creationTimestamp: '2024-09-03T13:38:11Z',
      generation: 1,
      name: 'global',
      namespace: 'open-cluster-management-global-set',
      resourceVersion: '617840',
      uid: '4a654ae4-ae2d-4d4a-b789-7c9e18f71fa9',
    },
    spec: {
      clusterSets: ['global'],
      decisionStrategy: {
        groupStrategy: {
          clustersPerDecisionGroup: 0,
        },
      },
      prioritizerPolicy: {
        mode: 'Additive',
      },
      spreadPolicy: {},
      tolerations: [
        {
          key: 'cluster.open-cluster-management.io/unreachable',
          operator: 'Equal',
        },
        {
          key: 'cluster.open-cluster-management.io/unavailable',
          operator: 'Equal',
        },
      ],
    },
    status: {
      conditions: [
        {
          lastTransitionTime: '2024-09-03T13:38:11Z',
          message: 'Placement configurations check pass',
          reason: 'Succeedconfigured',
          status: 'False',
          type: 'PlacementMisconfigured',
        },
        {
          lastTransitionTime: '2024-09-03T13:38:11Z',
          message: 'All cluster decisions scheduled',
          reason: 'AllDecisionsScheduled',
          status: 'True',
          type: 'PlacementSatisfied',
        },
      ],
      decisionGroups: [
        {
          clusterCount: 1,
          decisionGroupIndex: 0,
          decisionGroupName: '',
          decisions: ['global-decision-1'],
        },
      ],
      numberOfSelectedClusters: 1,
    },
  },
  {
    apiVersion: 'addon.open-cluster-management.io/v1alpha1',
    kind: 'ManagedClusterAddOn',
    metadata: {
      creationTimestamp: '2024-09-03T13:40:10Z',
      generation: 1,
      name: 'application-manager',
      namespace: 'local-cluster',
      ownerReferences: [
        {
          apiVersion: 'addon.open-cluster-management.io/v1alpha1',
          blockOwnerDeletion: true,
          controller: true,
          kind: 'ClusterManagementAddOn',
          name: 'application-manager',
          uid: '9acbd555-a7c8-45eb-87ab-5a901f2ddb54',
        },
      ],
      resourceVersion: '622223',
      uid: 'd89cedd2-3ec3-45db-861c-091d2d8da5f8',
    },
    spec: {
      installNamespace: 'open-cluster-management-agent-addon',
    },
    status: {
      conditions: [
        {
          lastTransitionTime: '2024-09-03T13:40:33Z',
          message: 'completed with no errors.',
          reason: 'Completed',
          status: 'False',
          type: 'Progressing',
        },
        {
          lastTransitionTime: '2024-09-03T13:40:49Z',
          message: 'application-manager add-on is available.',
          reason: 'ManagedClusterAddOnLeaseUpdated',
          status: 'True',
          type: 'Available',
        },
        {
          lastTransitionTime: '2024-09-03T13:40:32Z',
          message: 'Registration of the addon agent is configured',
          reason: 'SetPermissionApplied',
          status: 'True',
          type: 'RegistrationApplied',
        },
        {
          lastTransitionTime: '2024-09-03T13:40:32Z',
          message:
            'client certificate rotated starting from 2024-09-03 13:35:32 +0000 UTC to 2024-10-02 23:16:03 +0000 UTC',
          reason: 'ClientCertificateUpdated',
          status: 'True',
          type: 'ClusterCertificateRotated',
        },
        {
          lastTransitionTime: '2024-09-03T13:40:33Z',
          message: 'manifests of addon are applied successfully',
          reason: 'AddonManifestApplied',
          status: 'True',
          type: 'ManifestApplied',
        },
      ],
      namespace: 'open-cluster-management-agent-addon',
      registrations: [
        {
          signerName: 'kubernetes.io/kube-apiserver-client',
          subject: {
            groups: [
              'system:open-cluster-management:cluster:local-cluster:addon:application-manager',
              'system:open-cluster-management:addon:application-manager',
              'system:authenticated',
            ],
            user: 'system:open-cluster-management:cluster:local-cluster:addon:application-manager:agent:application-manager',
          },
        },
      ],
      supportedConfigs: [
        {
          group: 'addon.open-cluster-management.io',
          resource: 'addondeploymentconfigs',
        },
      ],
    },
  },
  {
    apiVersion: 'cluster.open-cluster-management.io/v1beta2',
    kind: 'ManagedClusterSet',
    metadata: {
      annotations: {
        'cluster.open-cluster-management.io/submariner-broker-ns': 'default-broker',
      },
      creationTimestamp: '2024-09-03T13:38:10Z',
      finalizers: [
        'cluster.open-cluster-management.io/managedclusterset-clusterrole',
        'cluster.open-cluster-management.io/submariner-cleanup',
      ],
      generation: 1,
      name: 'default',
      resourceVersion: '621280',
      uid: '22f2eee0-1892-4ce9-accf-701caf9a9227',
    },
    spec: {
      clusterSelector: {
        selectorType: 'ExclusiveClusterSetLabel',
      },
    },
    status: {
      conditions: [
        {
          lastTransitionTime: '2024-09-03T13:38:10Z',
          message: '1 ManagedClusters selected',
          reason: 'ClustersSelected',
          status: 'False',
          type: 'ClusterSetEmpty',
        },
      ],
    },
  },
  {
    apiVersion: 'addon.open-cluster-management.io/v1alpha1',
    kind: 'ClusterManagementAddOn',
    metadata: {
      annotations: {
        'addon.open-cluster-management.io/lifecycle': 'addon-manager',
        'installer.open-cluster-management.io/release-version': '2.12.0',
      },
      creationTimestamp: '2024-09-03T13:37:27Z',
      generation: 1,
      labels: {
        'installer.name': 'multiclusterhub',
        'installer.namespace': 'open-cluster-management',
      },
      name: 'application-manager',
      resourceVersion: '616776',
      uid: '9acbd555-a7c8-45eb-87ab-5a901f2ddb54',
    },
    spec: {
      addOnMeta: {
        description: 'Synchronizes application on the managed clusters from the hub',
        displayName: 'Application Manager',
      },
      installStrategy: {
        type: 'Manual',
      },
    },
  },
  {
    apiVersion: 'cluster.open-cluster-management.io/v1',
    kind: 'ManagedCluster',
    metadata: {
      annotations: {
        'installer.multicluster.openshift.io/release-version': '2.7.0',
        'open-cluster-management/created-via': 'other',
      },
      creationTimestamp: '2024-09-03T13:38:08Z',
      finalizers: [
        'managedcluster-import-controller.open-cluster-management.io/cleanup',
        'managedclusterinfo.finalizers.open-cluster-management.io',
        'open-cluster-management.io/managedclusterrole',
        'cluster.open-cluster-management.io/api-resource-cleanup',
        'managedcluster-import-controller.open-cluster-management.io/manifestwork-cleanup',
      ],
      generation: 4,
      labels: {
        cloud: 'Amazon',
        'cluster.open-cluster-management.io/clusterset': 'default',
        clusterID: 'f14613b1-ae61-4837-8ed0-9047833cbf7d',
        'feature.open-cluster-management.io/addon-application-manager': 'available',
        'feature.open-cluster-management.io/addon-cert-policy-controller': 'available',
        'feature.open-cluster-management.io/addon-cluster-proxy': 'available',
        'feature.open-cluster-management.io/addon-config-policy-controller': 'available',
        'feature.open-cluster-management.io/addon-governance-policy-framework': 'available',
        'feature.open-cluster-management.io/addon-hypershift-addon': 'available',
        'feature.open-cluster-management.io/addon-managed-serviceaccount': 'available',
        'feature.open-cluster-management.io/addon-work-manager': 'available',
        'local-cluster': 'true',
        name: 'local-cluster',
        openshiftVersion: '4.15.20',
        'openshiftVersion-major': '4',
        'openshiftVersion-major-minor': '4.15',
        'velero.io/exclude-from-backup': 'true',
        vendor: 'OpenShift',
      },
      name: 'local-cluster',
      resourceVersion: '710573',
      uid: 'e32f3aa3-98c4-44c9-8065-e87182bd62aa',
    },
    spec: {
      hubAcceptsClient: true,
      leaseDurationSeconds: 60,
      managedClusterClientConfigs: [
        {
          caBundle:
            'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURNakNDQWhxZ0F3SUJBZ0lJTHlwWVhvRXdMbzh3RFFZSktvWklodmNOQVFFTEJRQXdOekVTTUJBR0ExVUUKQ3hNSmIzQmxibk5vYVdaME1TRXdId1lEVlFRREV4aHJkV0psTFdGd2FYTmxjblpsY2kxc1lpMXphV2R1WlhJdwpIaGNOTWpRd09UQXlNRFF3TVRFeFdoY05NelF3T0RNeE1EUXdNVEV4V2pBM01SSXdFQVlEVlFRTEV3bHZjR1Z1CmMyaHBablF4SVRBZkJnTlZCQU1UR0d0MVltVXRZWEJwYzJWeWRtVnlMV3hpTFhOcFoyNWxjakNDQVNJd0RRWUoKS29aSWh2Y05BUUVCQlFBRGdnRVBBRENDQVFvQ2dnRUJBTFNYZ3pvZFcwbnI1TnVMUWRlWkdwT0t0WWsxZlVDQgozRDBlN3NPT0ZiWmorTG5lSytJQXZjZzRCUnN6VnhreVRiZHFkS0szeHZIVFNxTHJXeEUyVHpVMWtJb2xCZDdtCmlKUklTRnJFSEIzcVFxUkNyY053a3pxU2ptcWU0Vyt4b3FFcGp4cGUwdUl2TTZEOGd3L3Z1UzAvQnJYVWNIaEkKODcveHNWTk5FcHJBWmF1OW5VcUQvOVZaUk9FNVlhRENrd0ZhME90K3IvVlMyMW5YUzMzVDFsT3E5ckZaUVZBOQpielo4MUcxMjg4RnJqWlZNaDJHOVVFWTZRUnJiaVlwWmhDamIvN2lVdmRETldEc1BkQVRnZUx1b2V6SU9QMFFnCjlFTzVMcjdROUdOaU5WMW5WQUliSXNSMG9UR1Zkcmo2RnVjcFZ4NHJTR21ZRHJQamc3T2o3cWNDQXdFQUFhTkMKTUVBd0RnWURWUjBQQVFIL0JBUURBZ0trTUE4R0ExVWRFd0VCL3dRRk1BTUJBZjh3SFFZRFZSME9CQllFRkFmMQpPL2s1Y3F5eFdqc1dJTmFNVi9oWGlvVHRNQTBHQ1NxR1NJYjNEUUVCQ3dVQUE0SUJBUUNwWUpsYlBXb1pJM1FZClVydVhpWnFUQU1xVy9SUjVBWXAwS2ViMklrS0RodXA0Wkt3RzFYbERIbng1eGliL0RGN0VUTUdiVTBWUktnb1EKbGY1WExHUHNQUHphc1lZZW9GZzI2V0tnRVoxeFJpQ0NhRWMvb0M0djVUSCtVa2lQUFY4ZUM1TjlDWFc1SzVSYwo1MThRU0VYZEsxZzlCbUxYNERPcC92N2ZlejlaT01PS05vUFkyYzdpa2R5TWlJWnJVZGxZeURseS94bmpHa1pZClZqTDBaQnpVYnBvc2JFNmtFd1NJV3ZZSzlJa3lxWTZvVVJOM3J5Q2tncUV1blYzL01xcnN6STJBUDhDL2VPa24KWHM1UjZtbk8zNXQwWXZjeFp5TWw0REtlZi81WkxqYndoQ0o3dkpac2xxbXFyMEcybFFlZ1JiNHhaOUNmUWIwawphc0w4VkI2bwotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCi0tLS0tQkVHSU4gQ0VSVElGSUNBVEUtLS0tLQpNSUlEUURDQ0FpaWdBd0lCQWdJSWYwVmN3SDd2K3NJd0RRWUpLb1pJaHZjTkFRRUxCUUF3UGpFU01CQUdBMVVFCkN4TUpiM0JsYm5Ob2FXWjBNU2d3SmdZRFZRUURFeDlyZFdKbExXRndhWE5sY25abGNpMXNiMk5oYkdodmMzUXQKYzJsbmJtVnlNQjRYRFRJME1Ea3dNakEwTURFeE1Gb1hEVE0wTURnek1UQTBNREV4TUZvd1BqRVNNQkFHQTFVRQpDeE1KYjNCbGJuTm9hV1owTVNnd0pnWURWUVFERXg5cmRXSmxMV0Z3YVhObGNuWmxjaTFzYjJOaGJHaHZjM1F0CmMybG5ibVZ5TUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUF5dU1qVTJnZEt2bHYKeExHWlhyMnN6UDA4RTZGK25SczlENlNtdzNPREczeUk4S0hGUmROcjZzeDRBWXVqYW1iaUEwc0VXZEtoUC9yNApGWkl0TWZIeXdqaFRuVUZKSjIzeGFFUitROVRONFAvVnN1SDRkTzRpYjhNRW5qTnB0OE5VK2cybEJPbHllallHClFMcitSWVpRUXJaN3RMdTRkN09ZalZHMUVDMzZCZEJ1MkZzc1Ezc0xJWFZNVmYzTVh2VVRUcWJFYnF2aER1TnkKaWFEYWJjeTlWclVSY1BlcU9KM3ljTnBQK2x1NjNVeE0rcXN6MndQamN0K1h6RFBWVk43VGhzYkkzcUFVVWUrbQpGaWFYMExyTVppSTUzaXVkOFNFbnhWamg1b2piVGVtL3RQYmw0QUc2YzMvZktSUFZwaUhlY0tiOVg0WHFjUHFnCk9ielVGR09PZFFJREFRQUJvMEl3UURBT0JnTlZIUThCQWY4RUJBTUNBcVF3RHdZRFZSMFRBUUgvQkFVd0F3RUIKL3pBZEJnTlZIUTRFRmdRVUpUMFN3d25lV1FlcmJpSUdFQ1RUUkNYWFpxWXdEUVlKS29aSWh2Y05BUUVMQlFBRApnZ0VCQUs5TE1zdHhCMWM0YWRkejRnakM4TU9pLy9MRFRYVDA2Z0xDZkw2YzRPR1VnaEpFRXdGVjNMZCtQSEMxCmNsaTdvNURQcWdlcFRxRExrVDRNcXB0alphaGRCaVdxL0U2WXNPRnBhaWVoWmUzTmg4MnlUc0ZFdmE2UjZncFEKZ2txUHV2WGdqSjVYdUwrbjBkdmZGSnJUQ01UTUNiNHNtcTJ0bE1PUExyZnMzdnFWOXIybEtvbTJlWVg5U2JlMgorM2FZdjBPWjhVeHUwaHZPSEQwUkNsejhadTN3MTJKdEJob2hBVnZadEtuVTVab21kVlMxZ2J4aHhSRCt5amp2Cjdvc0JPenVmeHhOQjVzOHZGdzhPNGtlTDZXVWJGUVBzL25wUFZURGZVTkpJRTJoSENsVG5nQWlPQ3N4Rm44NFEKLzlTSnMwOEdRSlRmNWxVaEtxWVlRUlFEd01ZPQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCi0tLS0tQkVHSU4gQ0VSVElGSUNBVEUtLS0tLQpNSUlEVERDQ0FqU2dBd0lCQWdJSVQ0NVN0M0Q4c01zd0RRWUpLb1pJaHZjTkFRRUxCUUF3UkRFU01CQUdBMVVFCkN4TUpiM0JsYm5Ob2FXWjBNUzR3TEFZRFZRUURFeVZyZFdKbExXRndhWE5sY25abGNpMXpaWEoyYVdObExXNWwKZEhkdmNtc3RjMmxuYm1WeU1CNFhEVEkwTURrd01qQTBNREV4TUZvWERUTTBNRGd6TVRBME1ERXhNRm93UkRFUwpNQkFHQTFVRUN4TUpiM0JsYm5Ob2FXWjBNUzR3TEFZRFZRUURFeVZyZFdKbExXRndhWE5sY25abGNpMXpaWEoyCmFXTmxMVzVsZEhkdmNtc3RjMmxuYm1WeU1JSUJJakFOQmdrcWhraUc5dzBCQVFFRkFBT0NBUThBTUlJQkNnS0MKQVFFQTRBZmoydVFacDBuZnM2bGljaHNRSUo3L245UkNsYVV5MFhVVEJRcmlVcVJEMDIrZnJHb1ZqZ3VXUSt5NApCZXJiNWdBTFozdVI5bW9JaUdsRkRWTzVxbXRacnJOTjEzSzIxV2VsMlZ1Qys3L3hqU005R2dhQjRhd2d2VnVDCkVONTczU0pMQjN2NHRGbG1mMXpNTE5UVVZIVFZlV05sN21XYWRTck9raE54K3B1M2hEczBxUENKRlVmN1pPREwKTGxFcUFvdTZtMnRuQ1l5cG5QRXNGS2U1RythZWZoS2l3aTk2bktLSHFiRndPZzlOcG9oQTZFMU0yU1lPL2hGNwpUT05GNE02bE5XVFNwYngwNFU2WFdhSUpaMXpyT041VjA0WTYydWwzTDR3VkNtQ1hLZmt1anhwaHBQbWJBdDFaCk5oNkRVUDQ1VjNLcEpZLy9CUTN2VldTeG93SURBUUFCbzBJd1FEQU9CZ05WSFE4QkFmOEVCQU1DQXFRd0R3WUQKVlIwVEFRSC9CQVV3QXdFQi96QWRCZ05WSFE0RUZnUVVXdjlqbDc5Qy9GRWNITXErNmRzVUVBc1dzUnd3RFFZSgpLb1pJaHZjTkFRRUxCUUFEZ2dFQkFLbHhhUXUzU1lmVWVOV3RuL0hZWG5hbjFhWmJOQSs0dXVIUjRSL2ZEUXZrCkplRHp2WWt3UWpacldKcnlxaEQrTk43WHBvOFB1VUxwOStxNEZ4ZUk3ay9ockFhbjlWYkNEaHM0ZThXV09jelkKMU1HWFJVQ3dsTE9uRmdvS25nQU1ncW44c2hYSWhCOEhXeVd6UUdjMmpDZXhGendWdWtVTUdNWEptdk1nSDdTcgppRnRxdHN1dERaV2l2bUFHRHBIYWtlQXB6a0ZjQUxhOS8zdWNiNlB6ZGlUMjRMRVJ0eGNUUEVsMmlQR29PYzlwCjFla0Q2aHQ5TVIwck9HR1pOQnhpSWhjK0E5YnJjaUo0M2lGQnV3OGVGUDVIZTROUGEvQS8wTjI2eUxSV3hFQlAKZkl5d1oxcU1XRU1UUDFsT1dNVjRxSFpFbEpvaHk0clYyR2dXS0dDZDQrQT0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQotLS0tLUJFR0lOIENFUlRJRklDQVRFLS0tLS0KTUlJRGx6Q0NBbitnQXdJQkFnSUlSUGovaFc1WTJ5c3dEUVlKS29aSWh2Y05BUUVMQlFBd1dURlhNRlVHQTFVRQpBd3hPYjNCbGJuTm9hV1owTFd0MVltVXRZWEJwYzJWeWRtVnlMVzl3WlhKaGRHOXlYMnh2WTJGc2FHOXpkQzF5ClpXTnZkbVZ5ZVMxelpYSjJhVzVuTFhOcFoyNWxja0F4TnpJMU1qVXdNemd4TUI0WERUSTBNRGt3TWpBME1UTXcKTUZvWERUTTBNRGd6TVRBME1UTXdNVm93V1RGWE1GVUdBMVVFQXd4T2IzQmxibk5vYVdaMExXdDFZbVV0WVhCcApjMlZ5ZG1WeUxXOXdaWEpoZEc5eVgyeHZZMkZzYUc5emRDMXlaV052ZG1WeWVTMXpaWEoyYVc1bkxYTnBaMjVsCmNrQXhOekkxTWpVd016Z3hNSUlCSWpBTkJna3Foa2lHOXcwQkFRRUZBQU9DQVE4QU1JSUJDZ0tDQVFFQXo0QjAKK0RBUzErOFZQUkFIQnNldHhwdjFlSGg5aHFBVjFjMjExanFVbndXMUpJYVJtUHBRSlRscjRyOXVxQTNrT0g4SgpBVlUrNWhPUWJSMk5lTWlKcW10UWRheFpjUUt0U283UnpGRWU1d2JUSFBWN3k3bGhFSVcxZk0zR1ZLcWxMVGFSCmY0Y1VJcVZGcjVYSnpDYUFJVjQxN2F1M3JzbUhVVzBpSmFpeE4xSWdhNklITlp6cEpaNjAyYkorUnQ3VWgvd0oKWTRHQXBOM09OYXI2UzJLR2hieXAxVExrVFpEd0laUW1jbUh1anIxNEpCUFVGdkhUalZJaG9TN1NyM3IxVkJvWgpzN0FUNDNMVXRMeTdmOU1xSjE5VnVzTXpHT0JCMGtqUkFtUW1VRWJpUGMvMDFUNzlRVVhpN0NTNHNqdm5XR0RrCnBwb0U3V3I3Vmw2SVV1NGhUUUlEQVFBQm8yTXdZVEFPQmdOVkhROEJBZjhFQkFNQ0FxUXdEd1lEVlIwVEFRSC8KQkFVd0F3RUIvekFkQmdOVkhRNEVGZ1FVM0wxV3JJaWRVNENPVjdKVjJMaGFjMnVsSmtzd0h3WURWUjBqQkJndwpGb0FVM0wxV3JJaWRVNENPVjdKVjJMaGFjMnVsSmtzd0RRWUpLb1pJaHZjTkFRRUxCUUFEZ2dFQkFDdkcxTzIvCkJyY2dIWmdJU1VEZmlBNlBFSWdGbURONnhzM1hiT0JkclV2SmFHOTk4U2FScjFEbXhXVHNXZkJ0NUtrQVlBZ24KRVhpTmVmNDJ2N200S2dsaVdHSWxVL2NzVEV3bGtLTUxvcGZrNmI1RWlpWCtYb0dpRkJ6UVl0SEo1Y2swYzlBVwpnYTRDOGZHOTRKWFFqa1VEazVuQzA1Z2pQMFVhb3ExbmdOVFhTY2N4R1QrdDhmTG1GaGltZlhTeDdad3JCaHR1ClEvVlUzZWdUWm5TeW1KSklJQS9yNUdvNEhVSjBCY1d1dmd4eFdqUndBaXI3VTNETXl2alM3VHVEVWlzU3Q3VnIKbG9PQjhmSFdqUmdCdnpaN0g1aGJVUmRqdlBESUtPZ3F2T29PZDduNnRKa2ZoMVhWUDdHU1UzYW9RSXVqb0ppZApsZEt0eS9yWWtRQnpqTlk9Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0KLS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURtekNDQW9PZ0F3SUJBZ0lJVGpCYThCYlZ1Mjh3RFFZSktvWklodmNOQVFFTEJRQXdKakVrTUNJR0ExVUUKQXd3YmFXNW5jbVZ6Y3kxdmNHVnlZWFJ2Y2tBeE56STFNalV3TmpFd01CNFhEVEkwTURrd01qQTBNVFkxTTFvWApEVEkyTURrd01qQTBNVFkxTkZvd1BURTdNRGtHQTFVRUF3d3lLaTVoY0hCekxtTnpMV0YzY3kwME1UVXRjMlJ5Ck9HZ3VaR1YyTURJdWNtVmtMV05vWlhOMFpYSm1hV1ZzWkM1amIyMHdnZ0VpTUEwR0NTcUdTSWIzRFFFQkFRVUEKQTRJQkR3QXdnZ0VLQW9JQkFRQ3pKazc5L2I3QVVkd0pOMjE5UENHa2NyK3djcFIrbExZNmN0anA0V3NIYzdwNgpMR2Q0Z3A2STZpQVh0Lyt6dDJ4Q2Rtb0M4bTZIYjVuQ2pJZWR3RWtMcjBCYTkvVmYwUG9mUjV2Q3BDdnQ2ZmdiCllsVnBFd2ZDWnJIcFpnN2VGTXFuK0g0RmV3SkxZcEpQeWIyY2xOZTM3azdQVXNTcDlJdmMzTE4rd3NwTFJmdXMKKy9wNjZ6a3JKUXN6RkkxRFZiZlBQSFZMaWljczBpa29CS0RETUZvY3lBc0ZoRXBHSHp2Z3REOHpSNVAvV2EycQorcHVpZ2djc3I3WkZzVUtpekcvSEpJcnpnbUdFcm93aTRGaG9WdlFlRFdEMXdva3ladUJyNXduMFJBbERtYnNuClhFNDluZVNlYzJoNTFLQ0xOcTEyWW1pQjJYK2tSVWhtRTliSG03N0hBZ01CQUFHamdiVXdnYkl3RGdZRFZSMFAKQVFIL0JBUURBZ1dnTUJNR0ExVWRKUVFNTUFvR0NDc0dBUVVGQndNQk1Bd0dBMVVkRXdFQi93UUNNQUF3SFFZRApWUjBPQkJZRUZNYXFDSmRhcXdqZU9HSDg5S1dRN3M0RDhpMXpNQjhHQTFVZEl3UVlNQmFBRlBXVFZhVzVjT2plCjdnb0VjaElTUld0RWpkWnJNRDBHQTFVZEVRUTJNRFNDTWlvdVlYQndjeTVqY3kxaGQzTXROREUxTFhOa2NqaG8KTG1SbGRqQXlMbkpsWkMxamFHVnpkR1Z5Wm1sbGJHUXVZMjl0TUEwR0NTcUdTSWIzRFFFQkN3VUFBNElCQVFBMApjbDlEcjZoWFVkZXB6V0JHVHoraDNNMmlHaW1jOFFtSE1mcG1nYUFDc0N2c1RZckVGMGxobGFBQ2R0SVNza0JYClVlWHNmY0RWeXFxQVppY2hJTUxLSEtBKy83L0Z6NGNORXN2R3FCVWJQaDdBYUJTdU5ULzJvbDdPQTNSTUxYRkoKNjRBb3BGcUxFK0w4ZVZBazQrb0NwNDRzRkZWclFVYUtkRU5UZ3VEaDhFL3RvbkNzQ1BSbTREalJqN01LS0JURgp2b1RSdzZyZ0NNd1VIc25WdXJRc0xpak1lSHQyUUJMZDBEMU1ERjlldngwNDBUczZKUURuN0ZTeVVuR1hPeGpOCjZwN1lqelZDWEY3OGYxN0RMdDVZZXJNZzJZdThzUnVYbVRoV1J2bGlnVmdhNktQbENzQW9BN1g4ZlVoSktQUWMKYVVpOXZXMU1LblZTd05QNVVHNXkKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQotLS0tLUJFR0lOIENFUlRJRklDQVRFLS0tLS0KTUlJREREQ0NBZlNnQXdJQkFnSUJBVEFOQmdrcWhraUc5dzBCQVFzRkFEQW1NU1F3SWdZRFZRUUREQnRwYm1keQpaWE56TFc5d1pYSmhkRzl5UURFM01qVXlOVEEyTVRBd0hoY05NalF3T1RBeU1EUXhOalE1V2hjTk1qWXdPVEF5Ck1EUXhOalV3V2pBbU1TUXdJZ1lEVlFRRERCdHBibWR5WlhOekxXOXdaWEpoZEc5eVFERTNNalV5TlRBMk1UQXcKZ2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLQW9JQkFRREhpNEtWN3pnUWhER2hwYm5KQ0dldgpRTkFHbHZacmoyRzNkQWcyUXR3eUViQUdMc0ZVejFkejkza3VsWXBCVmpZSk1GODlDSGo0a0lMR3VDclovMWtsCnVjM3lLU0ZCNURJeC9OQ0E5WGV4MVNUb2pEOXNNZUZTZnVTTkNybnRucEJGZTJGdmoxakJSVUdRZXE0blhZenEKMGFHRDhtblRjdnZmSEpYdmdZU1dka0RBQ0ZOemo5Q0JYWlNTNnRzd0tEWElFaFlSTjk3WFdXWnZrTVBTVUw4aApkSlorYlBwRzBmUmExM05qTlpXdVo3ZnZONzJaK1V5RCswbE0vQnN3bFdyY2RsTmRxUWd1R1Q5aGNYbEN5MkhBCjBqbStlNE9jN25hYkx6aWZjNlRhdjY1dzh5OVpFdUN5ckwxWFlGQkZzMkdvTU9VMlI3ZWpORzROU0FNbWp5bU4KQWdNQkFBR2pSVEJETUE0R0ExVWREd0VCL3dRRUF3SUNwREFTQmdOVkhSTUJBZjhFQ0RBR0FRSC9BZ0VBTUIwRwpBMVVkRGdRV0JCVDFrMVdsdVhEbzN1NEtCSElTRWtWclJJM1dhekFOQmdrcWhraUc5dzBCQVFzRkFBT0NBUUVBCkkzdGx5SGsySDAvVitqTU9aZlQ3NEY1YjdLVzZUbThpaHc3YkU5WHYrMVFwczd3MVFlSE1mLzVFTXJ6UnRSQXgKQ09UWldNbzhoNERHb01reEhOREZ4SGhxZk9uU1I0a1h1bmhQWlUwV0oxeG1palh3VXlPVVFwYlZ2clVpUW05eQpuNEZyRE5SbllDbUdpSUdtVmNEaVMzbDhPeGNpV0o1SjdxMGNVY21yY3Y3T0JjbGswTDltaUF2Qy95ZWRSdGp1CnFEZEJtZFJoeUZYemFqdzZQdXl5V3VvZ2NMWlhqR2pxWEhzaGFtOWU3NzZKL2YxVlM2bGhWK05HYmRPeHhkak0KeVRONHh6LzZuUTRyQzliUDdPNmpKVDF5UTgvKzUwVURvaHpoSjM2WThWWXE2MGFvd2FUMTMvYlRURjBnRmZteQpNTW1zNHRMUEgrU05jczdxNEllU0RnPT0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=',
          url: 'https://api.cs-aws-415-sdr8h.dev02.red-chesterfield.com:6443',
        },
      ],
    },
    status: {
      allocatable: {
        cpu: '22500m',
        'ephemeral-storage': '285055434687',
        'hugepages-1Gi': '0',
        'hugepages-2Mi': '0',
        memory: '93035188Ki',
        pods: '750',
      },
      capacity: {
        core_worker: '24',
        cpu: '24',
        'ephemeral-storage': '312800196Ki',
        'hugepages-1Gi': '0',
        'hugepages-2Mi': '0',
        memory: '96488116Ki',
        pods: '750',
        socket_worker: '3',
      },
      clusterClaims: [
        {
          name: 'id.k8s.io',
          value: 'f14613b1-ae61-4837-8ed0-9047833cbf7d',
        },
        {
          name: 'kubeversion.open-cluster-management.io',
          value: 'v1.28.10+a2c84a5',
        },
        {
          name: 'platform.open-cluster-management.io',
          value: 'AWS',
        },
        {
          name: 'product.open-cluster-management.io',
          value: 'OpenShift',
        },
        {
          name: 'above.threshold.hostedclustercount.hypershift.openshift.io',
          value: 'false',
        },
        {
          name: 'apiserverurl.openshift.io',
          value: 'https://api.cs-aws-415-sdr8h.dev02.red-chesterfield.com:6443',
        },
        {
          name: 'consoleurl.cluster.open-cluster-management.io',
          value: 'https://console-openshift-console.apps.cs-aws-415-sdr8h.dev02.red-chesterfield.com',
        },
        {
          name: 'controlplanetopology.openshift.io',
          value: 'HighlyAvailable',
        },
        {
          name: 'full.hostedclustercount.hypershift.openshift.io',
          value: 'false',
        },
        {
          name: 'hostingcluster.hypershift.openshift.io',
          value: 'true',
        },
        {
          name: 'id.openshift.io',
          value: 'f14613b1-ae61-4837-8ed0-9047833cbf7d',
        },
        {
          name: 'infrastructure.openshift.io',
          value: '{"infraName":"cs-aws-415-sdr8h-rhf6m"}',
        },
        {
          name: 'oauthredirecturis.openshift.io',
          value: 'https://oauth-openshift.apps.cs-aws-415-sdr8h.dev02.red-chesterfield.com/oauth/token/implicit',
        },
        {
          name: 'region.open-cluster-management.io',
          value: 'us-east-1',
        },
        {
          name: 'schedulable.open-cluster-management.io',
          value: 'true',
        },
        {
          name: 'version.openshift.io',
          value: '4.15.20',
        },
        {
          name: 'zero.hostedclustercount.hypershift.openshift.io',
          value: 'true',
        },
      ],
      conditions: [
        {
          lastTransitionTime: '2024-09-03T15:43:49Z',
          message: 'Import succeeded',
          reason: 'ManagedClusterImported',
          status: 'True',
          type: 'ManagedClusterImportSucceeded',
        },
        {
          lastTransitionTime: '2024-09-03T13:38:11Z',
          message: 'Accepted by hub cluster admin',
          reason: 'HubClusterAdminAccepted',
          status: 'True',
          type: 'HubAcceptedManagedCluster',
        },
        {
          lastTransitionTime: '2024-09-03T13:38:21Z',
          message: 'The clock of the managed cluster is synced with the hub.',
          reason: 'ManagedClusterClockSynced',
          status: 'True',
          type: 'ManagedClusterConditionClockSynced',
        },
        {
          lastTransitionTime: '2024-09-03T13:38:22Z',
          message: 'Managed cluster joined',
          reason: 'ManagedClusterJoined',
          status: 'True',
          type: 'ManagedClusterJoined',
        },
        {
          lastTransitionTime: '2024-09-03T13:38:22Z',
          message: 'Managed cluster is available',
          reason: 'ManagedClusterAvailable',
          status: 'True',
          type: 'ManagedClusterConditionAvailable',
        },
      ],
      version: {
        kubernetes: 'v1.28.10+a2c84a5',
      },
    },
  },
  {
    apiVersion: 'config.openshift.io/v1',
    kind: 'Infrastructure',
    metadata: {
      creationTimestamp: '2024-09-02T04:09:46Z',
      generation: 1,
      name: 'cluster',
      resourceVersion: '515',
      uid: '2c313298-db7c-45fe-abc0-ca160479b6cc',
    },
    spec: {
      cloudConfig: {
        key: 'config',
        name: 'cloud-provider-config',
      },
      platformSpec: {
        aws: {},
        type: 'AWS',
      },
    },
    status: {
      apiServerInternalURI: 'https://api-int.cs-aws-415-sdr8h.dev02.red-chesterfield.com:6443',
      apiServerURL: 'https://api.cs-aws-415-sdr8h.dev02.red-chesterfield.com:6443',
      controlPlaneTopology: 'HighlyAvailable',
      cpuPartitioning: 'None',
      etcdDiscoveryDomain: '',
      infrastructureName: 'cs-aws-415-sdr8h-rhf6m',
      infrastructureTopology: 'HighlyAvailable',
      platform: 'AWS',
      platformStatus: {
        aws: {
          region: 'us-east-1',
        },
        type: 'AWS',
      },
    },
  },
]

const responseNoFilter = {
  page: 1,
  items: [
    {
      apiVersion: 'argoproj.io/v1alpha1',
      kind: 'ApplicationSet',
      metadata: {
        name: 'argoapplication-1',
        namespace: 'openshift-gitops',
      },
    },
    {
      apiVersion: 'argoproj.io/v1alpha1',
      kind: 'Application',
      metadata: {
        name: 'argoapplication-1',
        namespace: 'openshift-gitops',
      },
      spec: {
        destination: {
          namespace: 'argoapplication-1-ns',
          server: 'https://api.console-aws-48-pwc27.dev02.red-chesterfield.com:6443',
        },
        project: 'default',
        source: {
          path: 'foo',
          repoURL: 'https://test.com/test.git',
          targetRevision: 'HEAD',
        },
        syncPolicy: {},
      },
      status: {},
    },
    {
      apiVersion: 'apps/v1',
      kind: 'deployment',
      label: 'app=authentication-operator',
      metadata: {
        name: 'authentication-operator',
        namespace: 'authentication-operator-ns',
      },
      status: {
        cluster: 'local-cluster',
        resourceName: 'authentication-operator',
      },
    },
    {
      apiVersion: 'apps/v1',
      kind: 'deployment',
      label: 'app=authentication-operator',
      metadata: {
        name: 'authentication-operator',
        namespace: 'authentication-operator-ns',
      },
      status: {
        cluster: 'test-cluster',
        resourceName: 'authentication-operator',
      },
    },
    {
      apiVersion: 'argoproj.io/v1alpha1',
      kind: 'Application',
      metadata: {
        name: 'feng-remote-argo8',
        namespace: 'openshift-gitops',
        creationTimestamp: '2021-12-03T18:55:47Z',
      },
      spec: {
        destination: {
          namespace: 'feng-remote-namespace',
          name: 'in-cluster',
        },
        source: {
          path: 'helloworld-perf',
          repoURL: 'https://github.com/fxiang1/app-samples',
          targetRevision: 'HEAD',
        },
      },
      status: {
        cluster: 'feng-managed',
      },
    },
    {
      apiVersion: 'app.k8s.io/v1beta1',
      kind: 'Application',
      metadata: {
        name: 'test',
        namespace: 'default',
        annotations: {
          'apps.open-cluster-management.io/deployables': '',
          'apps.open-cluster-management.io/subscriptions':
            'default/test-subscription-1,default/test-subscription-1-local',
        },
      },
    },
    {
      apiVersion: 'apps/v1',
      kind: 'deployment',
      label: 'app=test-app;kustomize.toolkit.fluxcd.io/name=test-app;kustomize.toolkit.fluxcd.io/namespace=test-app-ns',
      metadata: {
        name: 'test-app',
        namespace: 'test-app-ns',
      },
      status: {
        cluster: 'test-cluster',
        resourceName: 'test-app',
      },
    },
  ],
  itemCount: 7,
  filterCounts: {
    type: {
      subscription: 1,
      appset: 1,
      argo: 2,
      openshift: 2,
      flux: 1,
    },
    cluster: {
      'local-cluster': 3,
      unknown: 1,
      'feng-managed': 1,
      'test-cluster': 2,
    },
  },
  emptyResult: false,
  isPreProcessed: true,
  request: {
    page: 1,
    perPage: 10,
    sortBy: {
      index: 0,
      direction: 'asc',
    },
  },
}

const responseFiltered = {
  page: 1,
  items: [
    {
      apiVersion: 'app.k8s.io/v1beta1',
      kind: 'Application',
      metadata: {
        name: 'test',
        namespace: 'default',
        annotations: {
          'apps.open-cluster-management.io/deployables': '',
          'apps.open-cluster-management.io/subscriptions':
            'default/test-subscription-1,default/test-subscription-1-local',
        },
      },
    },
  ],
  itemCount: 1,
  filterCounts: {
    type: {
      subscription: 1,
      appset: 1,
      argo: 2,
      openshift: 2,
      flux: 1,
    },
    cluster: {
      'local-cluster': 3,
      unknown: 1,
      'feng-managed': 1,
      'test-cluster': 2,
    },
  },
  emptyResult: false,
  isPreProcessed: true,
  request: {
    page: 1,
    perPage: 10,
    search: 'tes',
    filters: {
      type: ['subscription'],
    },
    sortBy: {
      index: 0,
      direction: 'desc',
    },
  },
}

/// to get exact nock request body, put bp at line 303 in /backend/node_modules/nock/lib/intercepted_request_router.js
function setupNocks() {
  //
  // REMOTE ARGO
  pagedSearchQueries.forEach((query, inx) => {
    const nocked = nock('https://search-search-api.undefined.svc.cluster.local:4010').post(
      '/searchapi/graphql',
      `{"operationName":"searchResult","variables":{"input":[{"filters":[{"property":"kind","values":["Application"]},{"property":"apigroup","values":["argoproj.io"]},{"property":"cluster","values":["!local-cluster"]},{"property":"name","values":[${query.map((q) => `"${q}"`).join(',')}]}],"limit":20000}]},"query":"query searchResult($input: [SearchInput]) {\\n  searchResult: search(input: $input) {\\n    items\\n  }\\n}"}`
    )
    if (inx === 0) {
      nocked.reply(200, {
        data: {
          searchResult: [
            {
              items: [
                {
                  apigroup: 'argoproj.io',
                  apiversion: 'v1alpha1',
                  cluster: 'feng-managed',
                  created: '2021-12-03T18:55:47Z',
                  destinationName: 'in-cluster',
                  destinationNamespace: 'feng-remote-namespace',
                  kind: 'application',
                  name: 'feng-remote-argo8',
                  namespace: 'openshift-gitops',
                  path: 'helloworld-perf',
                  repoURL: 'https://github.com/fxiang1/app-samples',
                  status: 'Healthy',
                  targetRevision: 'HEAD',
                  _clusterNamespace: 'feng-managed',
                  _rbac: 'feng-managed_argoproj.io_applications',
                  _uid: 'feng-managed/9896aad3-6789-4350-876c-bd3749c85b5d',
                },
              ],
            },
          ],
        },
      })
    } else {
      nocked.reply(200, {})
    }
  })

  //
  // REMOTE/LOCAL OCP and FLUX
  pagedSearchQueries.forEach((query, inx) => {
    const nocked = nock('https://search-search-api.undefined.svc.cluster.local:4010').post(
      '/searchapi/graphql',
      `{"operationName":"searchResult","variables":{"input":[{"filters":[{"property":"kind","values":["Deployment"]},{"property":"label","values":["kustomize.toolkit.fluxcd.io/name=*","helm.toolkit.fluxcd.io/name=*","app=*","app.kubernetes.io/part-of=*"]},{"property":"name","values":[${query.map((q) => `"${q}"`).join(',')}]}],"limit":200000}]},"query":"query searchResult($input: [SearchInput]) {\\n  searchResult: search(input: $input) {\\n    items\\n  }\\n}"}`
    )
    if (inx === 0) {
      nocked.reply(200, {
        data: {
          searchResult: [
            {
              items: [
                // local OCP
                {
                  apiversion: 'apps/v1',
                  kind: 'deployment',
                  label: 'app=authentication-operator',
                  name: 'authentication-operator',
                  namespace: 'authentication-operator-ns',
                  cluster: 'local-cluster',
                },
                // remote OCP
                {
                  apiversion: 'apps/v1',
                  kind: 'deployment',
                  label: 'app=authentication-operator',
                  name: 'authentication-operator',
                  namespace: 'authentication-operator-ns',
                  cluster: 'test-cluster',
                },
                // FLUX
                {
                  apiversion: 'apps/v1',
                  kind: 'deployment',
                  name: 'test-app',
                  namespace: 'test-app-ns',
                  label:
                    'app=test-app;kustomize.toolkit.fluxcd.io/name=test-app;kustomize.toolkit.fluxcd.io/namespace=test-app-ns',
                  cluster: 'test-cluster',
                },
              ],
            },
          ],
        },
      })
    } else {
      nocked.reply(200, {})
    }
  })
  //
  // RBAC
  nock(process.env.CLUSTER_API_URL)
    .post(
      '/apis/authorization.k8s.io/v1/selfsubjectaccessreviews',
      '{"apiVersion":"authorization.k8s.io/v1","kind":"SelfSubjectAccessReview","metadata":{},"spec":{"resourceAttributes":{"group":"argoproj.io","resource":"applications","verb":"list"}}}'
    )
    .reply(200, {
      status: {
        allowed: true,
      },
    })
  nock(process.env.CLUSTER_API_URL)
    .post(
      '/apis/authorization.k8s.io/v1/selfsubjectaccessreviews',
      '{"apiVersion":"authorization.k8s.io/v1","kind":"SelfSubjectAccessReview","metadata":{},"spec":{"resourceAttributes":{"group":"view.open-cluster-management.io","namespace":"default","resource":"managedclusterviews","verb":"create"}}}'
    )
    .reply(200, {
      status: {
        allowed: true,
      },
    })

  nock(process.env.CLUSTER_API_URL)
    .post(
      '/apis/authorization.k8s.io/v1/selfsubjectaccessreviews',
      '{"apiVersion":"authorization.k8s.io/v1","kind":"SelfSubjectAccessReview","metadata":{},"spec":{"resourceAttributes":{"group":"app.k8s.io","resource":"applications","verb":"list"}}}'
    )
    .reply(200, {
      status: {
        allowed: true,
      },
    })
  nock(process.env.CLUSTER_API_URL)
    .post(
      '/apis/authorization.k8s.io/v1/selfsubjectaccessreviews',
      '{"apiVersion":"authorization.k8s.io/v1","kind":"SelfSubjectAccessReview","metadata":{},"spec":{"resourceAttributes":{"group":"argoproj.io","resource":"applicationsets","verb":"list"}}}'
    )
    .reply(200, {
      status: {
        allowed: true,
      },
    })
  nock(process.env.CLUSTER_API_URL)
    .post(
      '/apis/authorization.k8s.io/v1/selfsubjectaccessreviews',
      '{"apiVersion":"authorization.k8s.io/v1","kind":"SelfSubjectAccessReview","metadata":{},"spec":{"resourceAttributes":{"group":"apps","resource":"deployments","verb":"list"}}}'
    )
    .reply(200, {
      status: {
        allowed: true,
      },
    })
  nock(process.env.CLUSTER_API_URL)
    .post(
      '/apis/authorization.k8s.io/v1/selfsubjectaccessreviews',
      '{"apiVersion":"authorization.k8s.io/v1","kind":"SelfSubjectAccessReview","metadata":{},"spec":{"resourceAttributes":{"group":"view.open-cluster-management.io","namespace":"openshift-gitops","resource":"managedclusterviews","verb":"create"}}}'
    )
    .reply(200, {
      status: {
        allowed: true,
      },
    })
  nock(process.env.CLUSTER_API_URL)
    .post(
      '/apis/authorization.k8s.io/v1/selfsubjectaccessreviews',
      '{"apiVersion":"authorization.k8s.io/v1","kind":"SelfSubjectAccessReview","metadata":{},"spec":{"resourceAttributes":{"group":"view.open-cluster-management.io","namespace":"authentication-operator-ns","resource":"managedclusterviews","verb":"create"}}}'
    )
    .reply(200, {
      status: {
        allowed: true,
      },
    })
  nock(process.env.CLUSTER_API_URL)
    .post(
      '/apis/authorization.k8s.io/v1/selfsubjectaccessreviews',
      '{"apiVersion":"authorization.k8s.io/v1","kind":"SelfSubjectAccessReview","metadata":{},"spec":{"resourceAttributes":{"group":"view.open-cluster-management.io","namespace":"test-app-ns","resource":"managedclusterviews","verb":"create"}}}'
    )
    .reply(200, {
      status: {
        allowed: true,
      },
    })
}

const resourceCache = {
  // subscription app
  '/app.k8s.io/v1beta1/applications': {
    'cc84e62f-edb9-413b-8bd7-38a32a21ce72': {
      resource: {
        apiVersion: 'app.k8s.io/v1beta1',
        kind: 'Application',
        metadata: {
          name: 'test',
          namespace: 'default',
          annotations: {
            'apps.open-cluster-management.io/deployables': '',
            'apps.open-cluster-management.io/subscriptions':
              'default/test-subscription-1,default/test-subscription-1-local',
          },
        },
      },
      eventID: 0,
    },
  },

  // local argo app
  '/argoproj.io/v1alpha1/applications': {
    'cc84e62f-edb9-413b-8bd7-38a32a21ce72': {
      resource: {
        apiVersion: 'argoproj.io/v1alpha1',
        kind: 'Application',
        metadata: {
          name: 'argoapplication-1',
          namespace: 'openshift-gitops',
        },
        spec: {
          destination: {
            namespace: 'argoapplication-1-ns',
            server: 'https://api.console-aws-48-pwc27.dev02.red-chesterfield.com:6443',
          },
          project: 'default',
          source: {
            path: 'foo',
            repoURL: 'https://test.com/test.git',
            targetRevision: 'HEAD',
          },
          syncPolicy: {},
        },
        status: {},
      },
      eventID: 0,
    },
  },
  // app set
  '/argoproj.io/v1alpha1/applicationsets': {
    'cc84e62f-edb9-413b-8bd7-38a32a21ce72': {
      resource: {
        apiVersion: 'argoproj.io/v1alpha1',
        kind: 'ApplicationSet',
        metadata: {
          name: 'argoapplication-1',
          namespace: 'openshift-gitops',
        },
      },
      eventID: 0,
    },
  },
  '/apps.open-cluster-management.io/v1/subscriptions': {
    '8b6d6503-dc8c-4ed6-b420-aa0df015fbf1': {
      resource: {
        apiVersion: 'apps.open-cluster-management.io/v1',
        kind: 'Subscription',
        metadata: {
          annotations: {
            'apps.open-cluster-management.io/git-branch': 'main',
            'apps.open-cluster-management.io/git-current-commit': '8f862b04775d23ba4aefe3064d031c968fdc5a3f',
            'apps.open-cluster-management.io/git-path': 'helloworld',
            'apps.open-cluster-management.io/reconcile-option': 'merge',
            'open-cluster-management.io/user-group': 'c3lzdGVtOmNsdXN0ZXItYWRtaW5zLHN5c3RlbTphdXRoZW50aWNhdGVk',
            'open-cluster-management.io/user-identity': 'a3ViZTphZG1pbg==',
          },
          creationTimestamp: '2024-07-02T17:45:25Z',
          generation: 1,
          labels: {
            app: 'test',
            'app.kubernetes.io/part-of': 'test',
            'apps.open-cluster-management.io/reconcile-rate': 'medium',
          },
          name: 'test-subscription-1',
          namespace: 'default',
          resourceVersion: '1625088',
          uid: '8b6d6503-dc8c-4ed6-b420-aa0df015fbf1',
        },
        spec: {
          channel: 'ggithubcom-fxiang1-app-samples-ns/ggithubcom-fxiang1-app-samples',
          placement: {
            placementRef: {
              kind: 'Placement',
              name: 'test-placement-1',
            },
          },
        },
        status: {
          lastUpdateTime: '2024-07-02T17:45:26Z',
          message: 'Active',
          phase: 'Propagated',
        },
      },
      eventID: 7,
    },

    'b7009958-d850-4ffc-9b04-57baa403ce47': {
      resource: {
        apiVersion: 'apps.open-cluster-management.io/v1',
        kind: 'Subscription',
        metadata: {
          annotations: {
            'apps.open-cluster-management.io/git-branch': 'main',
            'apps.open-cluster-management.io/git-path': 'helloworld',
            'apps.open-cluster-management.io/hosting-subscription': 'default/test-subscription-1',
            'apps.open-cluster-management.io/reconcile-option': 'merge',
            'open-cluster-management.io/user-group': 'c3lzdGVtOmNsdXN0ZXItYWRtaW5zLHN5c3RlbTphdXRoZW50aWNhdGVk',
            'open-cluster-management.io/user-identity': 'a3ViZTphZG1pbg==',
          },
          creationTimestamp: '2024-07-02T17:45:26Z',
          generation: 1,
          labels: {
            app: 'test',
            'app.kubernetes.io/part-of': 'test',
            'apps.open-cluster-management.io/reconcile-rate': 'medium',
          },
          name: 'test-subscription-1-local',
          namespace: 'default',
          ownerReferences: [
            {
              apiVersion: 'work.open-cluster-management.io/v1',
              kind: 'AppliedManifestWork',
              name: '099081ddd1c54a21bda5eae2f2c5013f0947c6ba3b8bdb1ceb7c38d7cfae3685-default-test-subscription-1',
              uid: 'e9054859-bfca-46d2-8952-bea381adc6fa',
            },
          ],
          resourceVersion: '2441151',
          uid: 'b7009958-d850-4ffc-9b04-57baa403ce47',
        },
        spec: {
          channel: 'ggithubcom-fxiang1-app-samples-ns/ggithubcom-fxiang1-app-samples',
          placement: {
            local: true,
          },
        },
        status: {
          ansiblejobs: {},
          appstatusReference: 'kubectl get appsubstatus -n default test-subscription-1',
          lastUpdateTime: '2024-07-03T13:05:00Z',
          message: 'Active',
          phase: 'Subscribed',
        },
      },
      eventID: 627,
    },
  },
  '/cluster.open-cluster-management.io/v1beta1/placementdecisions': {
    '7ba09bb1-5211-490f-a6d1-456322886ab0': {
      resource: {
        apiVersion: 'cluster.open-cluster-management.io/v1beta1',
        kind: 'PlacementDecision',
        metadata: {
          creationTimestamp: '2024-07-02T17:45:25Z',
          generation: 1,
          labels: {
            'cluster.open-cluster-management.io/decision-group-index': '0',
            'cluster.open-cluster-management.io/decision-group-name': '',
            'cluster.open-cluster-management.io/placement': 'test-placement-1',
          },
          name: 'test-placement-1-decision-1',
          namespace: 'default',
          ownerReferences: [
            {
              apiVersion: 'cluster.open-cluster-management.io/v1beta1',
              blockOwnerDeletion: true,
              controller: true,
              kind: 'Placement',
              name: 'test-placement-1',
              uid: '458708a1-f9fd-498b-9c2f-420ba246fe3f',
            },
          ],
          resourceVersion: '1625071',
          uid: '7ba09bb1-5211-490f-a6d1-456322886ab0',
        },
        status: {
          decisions: [
            {
              clusterName: 'local-cluster',
              reason: '',
            },
          ],
        },
      },
      eventID: 31,
    },
    'c93db359-83b3-435b-9e30-065ac8a10143': {
      resource: {
        apiVersion: 'cluster.open-cluster-management.io/v1beta1',
        kind: 'PlacementDecision',
        metadata: {
          creationTimestamp: '2024-07-01T04:36:10Z',
          generation: 1,
          labels: {
            'cluster.open-cluster-management.io/decision-group-index': '0',
            'cluster.open-cluster-management.io/decision-group-name': '',
            'cluster.open-cluster-management.io/placement': 'global',
          },
          name: 'global-decision-1',
          namespace: 'open-cluster-management-global-set',
          ownerReferences: [
            {
              apiVersion: 'cluster.open-cluster-management.io/v1beta1',
              blockOwnerDeletion: true,
              controller: true,
              kind: 'Placement',
              name: 'global',
              uid: '8e2ff464-d716-4be2-95e5-498cd5a14258',
            },
          ],
          resourceVersion: '33592',
          uid: 'c93db359-83b3-435b-9e30-065ac8a10143',
        },
        status: {
          decisions: [
            {
              clusterName: 'local-cluster',
              reason: '',
            },
          ],
        },
      },
      eventID: 33,
    },
  },
}
