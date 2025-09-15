targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment that can be used as part of naming resource convention')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

param dddExists bool

@description('Id of the user or app to assign application roles')
param principalId string

@minLength(1)
param gitHubOrganization string
@minLength(1)
param gitHubRepo string

// GitHub App configuration
@minLength(1)
param gitHubAppId string
@secure()
@minLength(1)
param gitHubAppClientId string
@secure()
@minLength(1)
param gitHubAppClientSecret string
@secure()
@minLength(1)
param gitHubAppPrivateKey string
@minLength(1)
param gitHubAppInstallationId string

@secure()
param googleFormsApiKey string
@secure()
param googleFormsFileId string

@minLength(1)
param domainName string
@minLength(1)
param certificateId string

param eventsAirClientId string
@secure()
param eventsAirClientSecret string
param eventsAirTenantId string
param eventsAirEventId string = ''
@secure()
param titoSecurityToken string
@secure()
param sessionize2025AllSessions string
@secure()
param sessionize2025Sessions string
@secure()
param sessionSecret string


// Tags that should be applied to all resources.
//
// Note that 'azd-service-name' tags should be applied separately to service host resources.
// Example usage:
//   tags: union(tags, { 'azd-service-name': <service name in azure.yaml> })
var tags = {
  'azd-env-name': environmentName
}

var abbrs = loadJsonContent('./abbreviations.json')
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
// Can only be 6 chars due to keyvault name length limit
var prefix = 'dddper'

resource rg 'Microsoft.Resources/resourceGroups@2022-09-01' = {
  name: '${prefix}-rg-${environmentName}'
  location: location
  tags: tags
}

module monitoring './shared/monitoring.bicep' = {
  name: 'monitoring'
  params: {
    location: location
    tags: tags
    logAnalyticsName: '${prefix}-${abbrs.operationalInsightsWorkspaces}${resourceToken}'
    applicationInsightsName: '${prefix}-${abbrs.insightsComponents}${resourceToken}'
  }
  scope: rg
}

module dashboard './shared/dashboard-web.bicep' = {
  name: 'dashboard'
  params: {
    name: '${prefix}-${abbrs.portalDashboards}${resourceToken}'
    applicationInsightsName: monitoring.outputs.applicationInsightsName
    location: location
    tags: tags
  }
  scope: rg
}

module registry './shared/registry.bicep' = {
  name: 'registry'
  params: {
    location: location
    tags: tags
    name: '${prefix}${abbrs.containerRegistryRegistries}${resourceToken}'
  }
  scope: rg
}

module keyVault './shared/keyvault.bicep' = {
  name: 'keyvault'
  params: {
    location: location
    tags: tags
    name: '${prefix}-${abbrs.keyVaultVaults}${resourceToken}'
    principalId: principalId
  }
  scope: rg
}

module storageAccount './shared/storage.bicep' = {
  name: 'storage'
  params: {
    location: location
    tags: tags
    name: '${prefix}${abbrs.storageStorageAccounts}${resourceToken}'
  }
  scope: rg
}

module appsEnv './shared/apps-env.bicep' = {
  name: 'apps-env'
  params: {
    name: '${prefix}-${abbrs.appManagedEnvironments}${resourceToken}'
    location: location
    tags: tags
    applicationInsightsName: monitoring.outputs.applicationInsightsName
    logAnalyticsWorkspaceName: monitoring.outputs.logAnalyticsWorkspaceName
  }
  scope: rg
}

module ddd './app/ddd.bicep' = {
  name: 'ddd'
  params: {
    name: '${prefix}-${abbrs.appContainerApps}ddd-${resourceToken}'
    location: location
    tags: tags
    identityName: '${prefix}-${abbrs.managedIdentityUserAssignedIdentities}ddd-${resourceToken}'
    applicationInsightsName: monitoring.outputs.applicationInsightsName
    containerAppsEnvironmentName: appsEnv.outputs.name
    containerRegistryName: registry.outputs.name
    exists: dddExists
    gitHubOrganization: gitHubOrganization
    gitHubRepo: gitHubRepo
    gitHubAppId: gitHubAppId
    gitHubAppClientId: gitHubAppClientId
    gitHubAppClientSecret: gitHubAppClientSecret
    gitHubAppPrivateKey: gitHubAppPrivateKey
    gitHubAppInstallationId: gitHubAppInstallationId
    googleFormsApiKey: googleFormsApiKey
    googleFormsFileId: googleFormsFileId
    domainName: domainName
    certificateId: certificateId
    eventsAirClientId: eventsAirClientId
    eventsAirClientSecret: eventsAirClientSecret
    eventsAirTenantId: eventsAirTenantId
    eventsAirEventId: eventsAirEventId
    titoSecurityToken: titoSecurityToken
    sessionize2025AllSessions: sessionize2025AllSessions
    sessionize2025Sessions: sessionize2025Sessions
    sessionSecret: sessionSecret
    storageAccountName: storageAccount.outputs.name
    storageAccountResourceId: storageAccount.outputs.resourceId
  }
  scope: rg
}

output AZURE_CONTAINER_REGISTRY_ENDPOINT string = registry.outputs.loginServer
output AZURE_KEY_VAULT_NAME string = keyVault.outputs.name
output AZURE_KEY_VAULT_ENDPOINT string = keyVault.outputs.endpoint
