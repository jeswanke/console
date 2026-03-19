// Pipeline: Console E2E — ALC (Application Lifecycle) Playwright tests only.
//
// Use this as the pipeline for a job whose workspace is the console-e2e repo (or the console-e2e subfolder).
//
// Requires on the agent: oc CLI, Node 18+.
//
// Jenkins credentials (Secret text):
//   - hub-cluster-url: cluster API URL (e.g. https://api.<cluster>.<domain>:6443)
//   - hub-cluster-password: kubeadmin password
//
// Optional: add reporter: ['html', ['junit', { outputFile: 'test-results/junit.xml' }]] in
// playwright.config.ts so the JUnit step below can publish test results to Jenkins.

pipeline {
  agent any

  options {
    timeout(time: 60, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  environment {
    CONSOLE_USERNAME = 'kubeadmin'
    CONSOLE_IDP = 'kube:admin'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Prepare environment') {
      steps {
        sh 'npm ci || npm install'
        sh 'npx playwright install --with-deps chromium'
      }
    }

    stage('OC Login') {
      steps {
        withCredentials([
          string(credentialsId: 'hub-cluster-url', variable: 'HUB_URL'),
          string(credentialsId: 'hub-cluster-password', variable: 'HUB_PASSWORD')
        ]) {
          sh '''
            oc login --server="${HUB_URL}" -u kubeadmin -p "${HUB_PASSWORD}" --insecure-skip-tls-verify
            oc whoami
          '''
        }
      }
    }

    stage('Run ALC tests') {
      steps {
        withCredentials([
          string(credentialsId: 'hub-cluster-password', variable: 'HUB_PASSWORD')
        ]) {
          sh '''
            export CONSOLE_USERNAME="${CONSOLE_USERNAME}"
            export CONSOLE_IDP="${CONSOLE_IDP}"
            npx playwright test --grep @alc --project=chromium
          '''
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'test-results/**,playwright-report/**', allowEmptyArchive: true
      junit allowEmptyResults: true, testResults: 'test-results/**/*.xml'
    }
    failure {
      echo 'ALC E2E run failed. Check test-results and playwright-report artifacts.'
    }
  }
}
