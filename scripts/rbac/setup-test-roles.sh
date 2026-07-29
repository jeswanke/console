#!/usr/bin/env bash

# Description:
#     Applies RBAC permissions for Virtualization test cases using template functions.
#     Requires ACM 2.16+ with Fine-Grained RBAC enabled.
#     Uses clusterSelection.type: placements (ACM 2.16 format).
#     Called by src/tests/fg-rbac/start.sh after gen-rbac.sh.

# Usage:
#     ./scripts/rbac/setup-test-roles.sh
#
# Environment Variables (all have defaults):
#     HUB_CLUSTER           - Hub cluster name (default: local-cluster)
#     SPOKE_CLUSTERS        - Space-separated spoke clusters (required, no default)
#     SPOKE_CLUSTER         - Primary spoke cluster (derived from SPOKE_CLUSTERS)
#     MCRA_NAMESPACE        - Default MCRA namespace (default: default)
#     MCRA_NAMESPACE_GLOBAL - Global MCRA namespace (default: open-cluster-management-global-set)
#     TARGET_NAMESPACE      - Target namespace for role bindings (default: default)
#     CCLM_NAMESPACE        - CCLM source namespace (default: cclm-test)

set -e


# ============================================================
# Environment Variables with Defaults
# ============================================================
export HUB_CLUSTER=${HUB_CLUSTER:-"${LOCAL_CLUSTER_NAME:-local-cluster}"}
# SPOKE_CLUSTERS: Falls back to VIRT_SPOKE_CLUSTER or CYPRESS_VIRT_SPOKE_CLUSTER (comma-separated -> space-separated).
# If none is set, spoke-related MCRAs will be skipped.
_SPOKE_FALLBACK="${VIRT_SPOKE_CLUSTER:-${CYPRESS_VIRT_SPOKE_CLUSTER}}"
export SPOKE_CLUSTERS=${SPOKE_CLUSTERS:-"${_SPOKE_FALLBACK//,/ }"}
export SPOKE_CLUSTER=${SPOKE_CLUSTER:-"${SPOKE_CLUSTERS%% *}"}  # First spoke as primary
export MCRA_NAMESPACE=${MCRA_NAMESPACE:-"default"}
export MCRA_NAMESPACE_GLOBAL=${MCRA_NAMESPACE_GLOBAL:-"open-cluster-management-global-set"}
export TARGET_NAMESPACE=${TARGET_NAMESPACE:-"default"}
export CCLM_NAMESPACE=${CCLM_NAMESPACE:-"cclm-test"}

# ============================================================
# Logging Functions
# All logging goes to stderr to avoid polluting stdout
# ============================================================
log_info() {
    echo "[INFO] $1" >&2
}

log_warn() {
    echo "[WARN] $1" >&2
}

log_error() {
    echo "[ERROR] $1" >&2
}

log_success() {
    echo "[OK] $1" >&2
}


# ============================================================
# Environment Validation
# ============================================================

# Validate that a managed cluster exists and is available
validate_cluster_exists() {
    local cluster_name="$1"
    
    if ! oc get managedcluster "$cluster_name" &>/dev/null; then
        log_warn "Managed cluster '$cluster_name' does not exist."
        return 1
    fi
    
    local available
    available=$(oc get managedcluster "$cluster_name" \
        -o jsonpath='{.status.conditions[?(@.type=="ManagedClusterConditionAvailable")].status}' 2>/dev/null)
    
    if [[ "$available" != "True" ]]; then
        log_warn "Managed cluster '$cluster_name' exists but is not available (status: ${available:-unknown})."
        return 1
    fi
    
    return 0
}

# Validate the environment and provide warnings for missing configurations
validate_environment() {
    log_info "Validating environment configuration..."
    local warnings=0
    
    # Check HUB_CLUSTER
    if ! validate_cluster_exists "${HUB_CLUSTER}"; then
        log_warn "Hub cluster '${HUB_CLUSTER}' is not available. Hub-related MCRAs may fail."
        warnings=$((warnings + 1))
    else
        log_success "Hub cluster '${HUB_CLUSTER}' is available."
    fi
    
    # Check SPOKE_CLUSTERS
    if [[ -z "${SPOKE_CLUSTERS}" ]]; then
        log_warn "SPOKE_CLUSTERS is not set. Spoke-related MCRAs will use hub cluster only."
        log_warn "Set SPOKE_CLUSTERS environment variable to include spoke clusters."
        warnings=$((warnings + 1))
    else
        for spoke in ${SPOKE_CLUSTERS}; do
            if ! validate_cluster_exists "$spoke"; then
                log_warn "Spoke cluster '$spoke' is not available. Some MCRAs may fail."
                warnings=$((warnings + 1))
            else
                log_success "Spoke cluster '$spoke' is available."
            fi
        done
    fi
    
    
    if [[ $warnings -gt 0 ]]; then
        log_warn "Environment validation completed with ${warnings} warning(s)."
        log_warn "Continuing with setup - some MCRAs may fail to apply correctly."
    else
        log_success "Environment validation completed successfully."
    fi
    
    return 0  # Always continue - let individual MCRA applications handle failures
}

# ============================================================
# Verify Fine-Grained RBAC is Available (ACM 2.16+)
# ============================================================
verify_fg_rbac() {
    log_info "Verifying Fine-Grained RBAC support..."
    
    # Check if MCRA CRD exists
    if ! oc get crd multiclusterroleassignments.rbac.open-cluster-management.io &> /dev/null; then
        log_error "MulticlusterRoleAssignment CRD not found."
        log_info "This script requires ACM 2.16+ with Fine-Grained RBAC enabled."
        log_info "Ensure the feature gate is enabled in the MultiClusterHub."
        return 1
    fi
    
    # Get ACM version for logging
    local mch_version
    mch_version=$(oc get mch -A -o jsonpath='{.items[0].status.currentVersion}' 2>/dev/null || echo "unknown")
    
    # Verify ACM >= 2.16
    local major_minor
    major_minor=$(echo "$mch_version" | grep -oE '^[0-9]+\.[0-9]+')
    if [[ -n "$major_minor" ]]; then
        if [[ "$(printf '%s\n' "2.16" "$major_minor" | sort -V | head -n1)" != "2.16" ]]; then
            log_error "ACM version $mch_version is older than 2.16."
            log_info "This script requires ACM 2.16+ (placements-based MCRAs)."
            log_info "For ACM 2.15, use the release-2.15 branch setup scripts."
            return 1
        fi
    fi
    
    # Get served API version from CRD
    local crd_api_version
    crd_api_version=$(oc get crd multiclusterroleassignments.rbac.open-cluster-management.io \
        -o jsonpath='{.spec.versions[?(@.served==true)].name}' 2>/dev/null)
    
    if [[ -z "$crd_api_version" ]]; then
        crd_api_version=$(oc get crd multiclusterroleassignments.rbac.open-cluster-management.io \
            -o jsonpath='{.spec.versions[0].name}' 2>/dev/null)
    fi
    
    # Export the API version for use in MCRA creation
    export MCRA_API_VERSION="rbac.open-cluster-management.io/${crd_api_version}"
    
    log_info "ACM Version: $mch_version"
    log_info "MCRA API: $MCRA_API_VERSION"
    log_success "Fine-Grained RBAC is available (placements format)."
    return 0
}

# ============================================================
# Create OCP Groups
# ============================================================
create_ocp_groups() {
    log_info "Creating OCP groups (tier: ${VIRT_TIER:-custom})..."

    # RBAC-UI tier groups (always created)
    # RHACM4K-60252: Test group for Role Assignment UI creation test
    oc adm groups new clc-e2e-group-60252 2>/dev/null || log_info "Group clc-e2e-group-60252 already exists"
    oc adm groups add-users clc-e2e-group-60252 clc-e2e-edit-cluster 2>/dev/null || log_info "User already in group"

    # RHACM4K-60255: Disposable group for delete test
    oc adm groups new clc-e2e-group-60255 2>/dev/null || log_info "Group clc-e2e-group-60255 already exists"
    oc adm groups add-users clc-e2e-group-60255 clc-e2e-del-60255 2>/dev/null || log_info "User already in group"

    # RHACM4K-60251: Full Fleet Administrator (LDAP group)
    oc adm groups new qe-admin-group-60251 2>/dev/null || log_info "Group qe-admin-group-60251 already exists"
    oc adm groups add-users qe-admin-group-60251 qe-admin-user 2>/dev/null || log_info "User already in group"

    # RHACM4K-60229: Read-Only Fleet Viewer (LDAP group)
    oc adm groups new qe-view-group-60229 2>/dev/null || log_info "Group qe-view-group-60229 already exists"
    oc adm groups add-users qe-view-group-60229 qe-view-user 2>/dev/null || log_info "User already in group"

    # VM tier groups (only when vm/full/custom)
    if [[ "${VIRT_TIER:-custom}" == "vm" || "${VIRT_TIER:-custom}" == "full" || "${VIRT_TIER:-custom}" == "custom" ]]; then
        # RHACM4K-60307: Last assignment cleanup group
        oc adm groups new clc-e2e-group-60307 2>/dev/null || log_info "Group clc-e2e-group-60307 already exists"
        oc adm groups add-users clc-e2e-group-60307 clc-e2e-group-last 2>/dev/null || log_info "User already in group"

        # RHACM4K-60239: Spoke operator group
        oc adm groups new clc-e2e-group-60239 2>/dev/null || log_info "Group clc-e2e-group-60239 already exists"
        oc adm groups add-users clc-e2e-group-60239 clc-e2e-operator 2>/dev/null || log_info "User already in group"
    fi
    log_success "OCP groups created."
}

# ============================================================
# Placement Template Functions (ACM 2.16+)
# ============================================================

# Generate and apply a Placement CR dynamically
apply_placement() {
    local name="$1"
    local clusters="$2"  # space-separated cluster list
    
    # Build matchExpressions values array
    local values_yaml=""
    for cluster in ${clusters}; do
        values_yaml="${values_yaml}
                - ${cluster}"
    done
    
    log_info "Creating Placement: ${name} for clusters: ${clusters}"
    
    cat <<EOF | oc apply -f -
apiVersion: cluster.open-cluster-management.io/v1beta1
kind: Placement
metadata:
  name: ${name}
  namespace: ${MCRA_NAMESPACE_GLOBAL}
spec:
  predicates:
    - requiredClusterSelector:
        labelSelector:
          matchExpressions:
            - key: name
              operator: In
              values:${values_yaml}
EOF

    if [[ $? -eq 0 ]]; then
        log_success "Placement ${name} created."
    else
        log_error "Failed to create Placement ${name}."
        return 1
    fi
}

# Wait for a Placement to have at least one selected cluster
# Args: placement_name [timeout_seconds]
wait_for_placement_decision() {
    local name="$1"
    local timeout="${2:-60}"
    local interval=3
    local elapsed=0
    
    log_info "Waiting for Placement ${name} to select clusters (timeout: ${timeout}s)..."
    
    while [[ $elapsed -lt $timeout ]]; do
        local num_selected
        num_selected=$(oc get placement "${name}" -n "${MCRA_NAMESPACE_GLOBAL}" \
            -o jsonpath='{.status.numberOfSelectedClusters}' 2>/dev/null || echo "0")
        
        if [[ -n "$num_selected" && "$num_selected" -gt 0 ]]; then
            log_success "Placement ${name} selected ${num_selected} cluster(s)."
            return 0
        fi
        
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    
    log_warn "Placement ${name} did not select any clusters within ${timeout}s."
    log_warn "This may cause MCRA application to fail. Continuing anyway..."
    return 0  # Don't fail - let MCRA application handle it
}

# Apply all required Placements for ACM 2.16+
apply_all_placements() {
    log_info "Creating Placement CRs for ACM 2.16+..."
    
    apply_placement "rbac-hub-placement" "${HUB_CLUSTER}"
    apply_placement "rbac-spoke-placement" "${SPOKE_CLUSTERS}"
    apply_placement "rbac-hub-spoke-placement" "${HUB_CLUSTER} ${SPOKE_CLUSTERS}"
    
    
    log_success "All Placements created."
    
    # Wait for placements to be scheduled with proper polling
    log_info "Waiting for Placements to be scheduled..."
    wait_for_placement_decision "rbac-hub-placement" 30
    wait_for_placement_decision "rbac-spoke-placement" 30
    # Only wait for hub-spoke if we have spokes
    if [[ -n "${SPOKE_CLUSTERS}" ]]; then
        wait_for_placement_decision "rbac-hub-spoke-placement" 30
    fi
    
    log_success "Placement scheduling complete."
}

# ============================================================
# Ensure Required Namespaces on Spoke Clusters
# ============================================================
# Some MCRAs target specific namespaces (e.g., cclm-test) on spoke clusters.
# If these namespaces do not exist, the MCRA controller will report
# ApplicationFailed. This function ensures they exist before MCRA application.

ensure_spoke_namespaces() {
    local namespaces_to_create=("${CCLM_NAMESPACE}")
    
    if [[ -z "${SPOKE_CLUSTERS}" ]]; then
        log_warn "No spoke clusters configured. Skipping spoke namespace creation."
        return 0
    fi
    
    log_info "Ensuring required namespaces exist on spoke clusters..."
    
    for cluster in ${SPOKE_CLUSTERS}; do
        for ns in "${namespaces_to_create[@]}"; do
            if [[ -z "$ns" ]]; then
                continue
            fi
            
            if [[ "$cluster" == "local-cluster" ]]; then
                # For local-cluster, create namespace directly
                if oc get namespace "$ns" &>/dev/null; then
                    log_info "Namespace '$ns' already exists on local-cluster."
                else
                    log_info "Creating namespace '$ns' on local-cluster..."
                    oc create namespace "$ns" 2>/dev/null || log_warn "Failed to create namespace '$ns' on local-cluster."
                fi
            else
                # For remote spokes, use ManifestWork to create the namespace
                log_info "Ensuring namespace '$ns' on spoke '$cluster' via ManifestWork..."
                cat <<NSEOF | oc apply -f -
apiVersion: work.open-cluster-management.io/v1
kind: ManifestWork
metadata:
  name: ensure-ns-${ns}
  namespace: ${cluster}
spec:
  workload:
    manifests:
    - apiVersion: v1
      kind: Namespace
      metadata:
        name: ${ns}
NSEOF
                if [[ $? -eq 0 ]]; then
                    log_success "ManifestWork for namespace '$ns' applied to '$cluster'."
                else
                    log_warn "Failed to apply ManifestWork for namespace '$ns' on '$cluster'."
                fi
            fi
        done
    done
    
    # Brief wait for ManifestWorks to be processed
    if [[ "${SPOKE_CLUSTERS}" != "local-cluster" ]]; then
        log_info "Waiting 10s for ManifestWorks to be processed..."
        sleep 10
    fi
    
    log_success "Spoke namespace setup complete."
}
# ============================================================
# MCRA Template Functions
# ============================================================

# Generate clusterSelection YAML block (placements format)
# Args: placement_name
generate_cluster_selection() {
    local placement="$1"
    echo "        type: placements
        placements:
          - name: ${placement}
            namespace: ${MCRA_NAMESPACE_GLOBAL}"
}

# Generate targetNamespaces YAML block
# Args: namespace (empty or "none" means all namespaces)
generate_target_namespaces() {
    local ns="$1"
    if [[ -z "$ns" || "$ns" == "none" || "$ns" == "[]" ]]; then
        echo "[]"
    else
        # Handle multiple namespaces (comma-separated)
        local ns_yaml="["
        local first=true
        IFS=',' read -ra NS_ARRAY <<< "$ns"
        for n in "${NS_ARRAY[@]}"; do
            n=$(echo "$n" | xargs)  # trim whitespace
            if [[ "$first" == true ]]; then
                ns_yaml="${n}"
                first=false
            else
                ns_yaml="${ns_yaml}, ${n}"
            fi
        done
        # Format as YAML list
        echo ""
        for n in "${NS_ARRAY[@]}"; do
            n=$(echo "$n" | xargs)
            echo "        - ${n}"
        done
    fi
}

# Apply a single MCRA with one role assignment
# Args: mcra_name subject_kind subject_name role_name cluster_role placement target_ns
apply_mcra_single() {
    local mcra_name="$1"
    local subject_kind="$2"
    local subject_name="$3"
    local role_name="$4"
    local cluster_role="$5"
    local placement="$6"
    local target_ns="$7"
    
    local cluster_selection
    cluster_selection=$(generate_cluster_selection "$placement")
    
    local target_ns_yaml
    if [[ -z "$target_ns" || "$target_ns" == "none" ]]; then
        target_ns_yaml="[]"
    else
        target_ns_yaml=""
        IFS=',' read -ra NS_ARRAY <<< "$target_ns"
        for n in "${NS_ARRAY[@]}"; do
            n=$(echo "$n" | xargs)
            target_ns_yaml="${target_ns_yaml}
        - ${n}"
        done
    fi
    
    log_info "Applying MCRA: ${mcra_name} (${subject_kind}: ${subject_name})"
    
    cat <<EOF | oc apply -f -
apiVersion: ${MCRA_API_VERSION}
kind: MulticlusterRoleAssignment
metadata:
  name: ${mcra_name}
  namespace: ${MCRA_NAMESPACE_GLOBAL}
spec:
  subject:
    kind: ${subject_kind}
    name: ${subject_name}
    apiGroup: rbac.authorization.k8s.io
  roleAssignments:
    - name: ${role_name}
      clusterRole: ${cluster_role}
      clusterSelection:
${cluster_selection}
      targetNamespaces: ${target_ns_yaml}
EOF

    if [[ $? -eq 0 ]]; then
        log_success "MCRA ${mcra_name} applied."
    else
        log_error "Failed to apply MCRA ${mcra_name}."
        return 1
    fi
}

# Apply MCRA with multiple role assignments using heredoc
# This handles complex MCRAs with multiple roles
apply_mcra_multi() {
    local mcra_name="$1"
    local subject_kind="$2"
    local subject_name="$3"
    shift 3
    # Remaining args: "role_name|cluster_role|placement|target_ns" ...
    
    local roles_yaml=""
    for role_spec in "$@"; do
        IFS='|' read -r role_name cluster_role placement target_ns <<< "$role_spec"
        
        local cluster_selection
        cluster_selection=$(generate_cluster_selection "$placement")
        
        local target_ns_yaml
        if [[ -z "$target_ns" || "$target_ns" == "none" ]]; then
            target_ns_yaml="[]"
        else
            target_ns_yaml=""
            IFS=',' read -ra NS_ARRAY <<< "$target_ns"
            for n in "${NS_ARRAY[@]}"; do
                n=$(echo "$n" | xargs)
                target_ns_yaml="${target_ns_yaml}
        - ${n}"
            done
        fi
        
        roles_yaml="${roles_yaml}
    - name: ${role_name}
      clusterRole: ${cluster_role}
      clusterSelection:
${cluster_selection}
      targetNamespaces: ${target_ns_yaml}"
    done
    
    log_info "Applying MCRA: ${mcra_name} (${subject_kind}: ${subject_name}) with $(($#)) role assignments"
    
    cat <<EOF | oc apply -f -
apiVersion: ${MCRA_API_VERSION}
kind: MulticlusterRoleAssignment
metadata:
  name: ${mcra_name}
  namespace: ${MCRA_NAMESPACE_GLOBAL}
spec:
  subject:
    kind: ${subject_kind}
    name: ${subject_name}
    apiGroup: rbac.authorization.k8s.io
  roleAssignments:${roles_yaml}
EOF

    if [[ $? -eq 0 ]]; then
        log_success "MCRA ${mcra_name} applied."
    else
        log_error "Failed to apply MCRA ${mcra_name}."
        return 1
    fi
}

# ============================================================
# MCRA Validation Functions
# ============================================================

# Validate that an MCRA has been applied successfully
# Checks for conditions indicating the MCRA is processed
# Args: mcra_name [timeout_seconds]
validate_mcra_applied() {
    local name="$1"
    local timeout="${2:-30}"
    local interval=3
    local elapsed=0
    
    log_info "Validating MCRA ${name} status..."
    
    while [[ $elapsed -lt $timeout ]]; do
        # Check if MCRA exists and has status
        local status
        status=$(oc get multiclusterroleassignment "${name}" -n "${MCRA_NAMESPACE_GLOBAL}" \
            -o jsonpath='{.status.conditions[?(@.type=="Applied")].status}' 2>/dev/null)
        
        if [[ "$status" == "True" ]]; then
            log_success "MCRA ${name} is Applied."
            return 0
        fi
        
        # Also check for error conditions
        local error_status
        error_status=$(oc get multiclusterroleassignment "${name}" -n "${MCRA_NAMESPACE_GLOBAL}" \
            -o jsonpath='{.status.conditions[?(@.type=="Applied")].reason}' 2>/dev/null)
        
        if [[ -n "$error_status" && "$error_status" != "Applied" ]]; then
            log_warn "MCRA ${name} has status: ${error_status}"
        fi
        
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    
    log_warn "MCRA ${name} did not reach Applied status within ${timeout}s."
    return 0  # Don't fail - the MCRA may still be processing
}

# Validate all MCRAs in the global namespace
validate_all_mcras() {
    log_info "Validating all MCRAs have been applied..."
    
    local mcra_list
    mcra_list=$(oc get multiclusterroleassignment -n "${MCRA_NAMESPACE_GLOBAL}" \
        -o jsonpath='{.items[*].metadata.name}' 2>/dev/null)
    
    if [[ -z "$mcra_list" ]]; then
        log_warn "No MCRAs found in namespace ${MCRA_NAMESPACE_GLOBAL}."
        return 0
    fi
    
    local applied_count=0
    local total_count=0
    
    for mcra in $mcra_list; do
        total_count=$((total_count + 1))
        local status
        status=$(oc get multiclusterroleassignment "${mcra}" -n "${MCRA_NAMESPACE_GLOBAL}" \
            -o jsonpath='{.status.conditions[?(@.type=="Applied")].status}' 2>/dev/null)
        
        if [[ "$status" == "True" ]]; then
            applied_count=$((applied_count + 1))
        else
            log_warn "MCRA ${mcra} is not yet Applied (status: ${status:-unknown})"
        fi
    done
    
    log_info "MCRA validation: ${applied_count}/${total_count} MCRAs have Applied status."
    
    if [[ $applied_count -eq $total_count ]]; then
        log_success "All MCRAs are Applied."
    else
        log_warn "Some MCRAs are still being processed. This is normal if the cluster is busy."
    fi
    
    return 0
}

# ============================================================
# Apply All 23 MCRAs
# ============================================================
apply_all_mcras() {
    log_info "Applying MCRA definitions (tier: ${VIRT_TIER:-custom})..."
    local success_count=0
    local fail_count=0
    local total_count=0
    
    # Helper function to track results
    track_result() {
        total_count=$((total_count + 1))
        if [[ $1 -eq 0 ]]; then
            success_count=$((success_count + 1))
        else
            fail_count=$((fail_count + 1))
        fi
    }

    # ── VM tier MCRAs (only when VIRT_TIER is vm, full, or custom) ──
    if [[ "${VIRT_TIER:-custom}" == "vm" || "${VIRT_TIER:-custom}" == "full" || "${VIRT_TIER:-custom}" == "custom" ]]; then
    log_info "Creating VM tier MCRAs..."
    
    # 01-std-view: Standard kubevirt:view globally (no hub role - limited visibility)
    # Used in: RHACM4K-60309, User: clc-e2e-std-view
    apply_mcra_single "clc-e2e-std-view-assignment" "User" "clc-e2e-std-view-60309" \
        "kubevirt-view-global" "kubevirt.io:view" "rbac-hub-spoke-placement" "none"
    track_result $?
    
    # 02-std-edit: Standard kubevirt:edit globally (no hub role - limited visibility)
    # Used in: RHACM4K-60309, User: clc-e2e-std-edit
    apply_mcra_single "clc-e2e-std-edit-assignment" "User" "clc-e2e-std-edit-60309" \
        "kubevirt-edit-global" "kubevirt.io:edit" "rbac-hub-spoke-placement" "none"
    track_result $?
    
    # 03-std-admin: Standard kubevirt:admin globally (no hub role - limited visibility)
    # Used in: RHACM4K-60309, User: clc-e2e-std-admin
    apply_mcra_single "clc-e2e-std-admin-assignment" "User" "clc-e2e-std-admin-60309" \
        "kubevirt-admin-global" "kubevirt.io:admin" "rbac-hub-spoke-placement" "none"
    track_result $?
    
    # 04-hub-view-only: Hub view role only (no kubevirt:view)
    # Used in: RHACM4K-60310, User: clc-e2e-hub-view-only
    apply_mcra_single "clc-e2e-hub-view-only-assignment" "User" "clc-e2e-hub-view-only-60310" \
        "hub-view-access" "acm-vm-fleet:view" "rbac-hub-placement" "none"
    track_result $?
    
    # 05-hub-view: Hub view role with kubevirt:view globally
    # Used in: RHACM4K-60310, User: clc-e2e-hub-view
    apply_mcra_multi "clc-e2e-hub-view-assignment" "User" "clc-e2e-hub-view-60310" \
        "hub-view-access|acm-vm-fleet:view|rbac-hub-placement|none" \
        "global-view-access|kubevirt.io:view|rbac-hub-spoke-placement|none"
    track_result $?
    
    # 06-hub-admin: Hub admin role with kubevirt:view on spoke
    # Used in: RHACM4K-60311, User: clc-e2e-hub-admin
    apply_mcra_multi "clc-e2e-hub-admin-assignment" "User" "clc-e2e-hub-admin-60311" \
        "hub-admin-access|acm-vm-fleet:admin|rbac-hub-placement|none" \
        "spoke-view-access|kubevirt.io:view|rbac-spoke-placement|none"
    track_result $?
    
    # 07-managed-view: Managed view infrastructure role
    # Used in: RHACM4K-60467, User: clc-e2e-managed-view
    apply_mcra_multi "clc-e2e-managed-view-assignment" "User" "clc-e2e-managed-view-60467" \
        "hub-view-access|acm-vm-fleet:view|rbac-hub-placement|none" \
        "managed-view-access|acm-vm-extended:view|rbac-spoke-placement|${TARGET_NAMESPACE}" \
        "kubevirt-view-access|kubevirt.io:view|rbac-spoke-placement|${TARGET_NAMESPACE}"
    track_result $?
    
    # 08-managed-admin: Managed admin infrastructure role
    # Used in: RHACM4K-60468, User: clc-e2e-managed-admin
    # Role assignments:
    # - acm-vm-fleet:view (local-cluster, all namespaces)
    # - acm-vm-extended:admin (virtualization spoke, default namespace)
    # - kubevirt.io:view (virtualization spoke, all namespaces)
    apply_mcra_multi "clc-e2e-managed-admin-assignment" "User" "clc-e2e-managed-admin-60468" \
        "hub-view-access|acm-vm-fleet:view|rbac-hub-placement|none" \
        "managed-admin-access|acm-vm-extended:admin|rbac-spoke-placement|default" \
        "kubevirt-view-access|kubevirt.io:view|rbac-spoke-placement|none"
    track_result $?
    
    # 09-spoke-view-ns: Consolidated spoke view role (namespace-scoped)
    # Used in: RHACM4K-60302, 60303, 60304, 60305, 60306, User: clc-e2e-spoke-view-ns
    apply_mcra_single "clc-e2e-spoke-view-ns-assignment" "User" "clc-e2e-spoke-view-ns-60302-60306" \
        "view-access-assignment" "kubevirt.io:view" "rbac-spoke-placement" "${TARGET_NAMESPACE}"
    track_result $?
    
    # 10-edit-test: Edit role for MCRA delete test
    # Used in: RHACM4K-60303, User: clc-e2e-edit-test
    apply_mcra_single "clc-e2e-edit-test-assignment" "User" "clc-e2e-edit-test-60303" \
        "edit-access-assignment" "kubevirt.io:edit" "rbac-spoke-placement" "${TARGET_NAMESPACE}"
    track_result $?
    
    # 11-group-60307: Last assignment cleanup (group-based)
    # Used in: RHACM4K-60307, Group: clc-e2e-group-60307
    apply_mcra_single "clc-e2e-group-60307-assignment" "Group" "clc-e2e-group-60307" \
        "group-edit-assignment" "kubevirt.io:edit" "rbac-spoke-placement" "${TARGET_NAMESPACE}"
    track_result $?
    
    # 12-idp-kubevirt-htpasswd: IDP-agnostic kubevirtprojects test (HTPasswd)
    # Used in: RHACM4K-60257, User: clc-e2e-idp-kubevirt
    apply_mcra_single "htpasswd-idp-kubevirt-assignment" "User" "clc-e2e-idp-kubevirt-60257" \
        "hub-kubevirtprojects-access" "acm-vm-fleet:view" "rbac-hub-placement" "none"
    track_result $?
    
    # 13-idp-kubevirt-ldap: IDP-agnostic kubevirtprojects test (LDAP)
    # Used in: RHACM4K-60257, User: qe-idp-kubevirt
    apply_mcra_single "ldap-idp-kubevirt-assignment" "User" "qe-idp-kubevirt" \
        "hub-kubevirtprojects-access" "acm-vm-fleet:view" "rbac-hub-placement" "none"
    track_result $?
    
    # 14-idp-vm-htpasswd: IDP-agnostic VM permissions test (HTPasswd)
    # Used in: RHACM4K-60258, User: clc-e2e-idp-vm
    apply_mcra_multi "htpasswd-idp-vm-assignment" "User" "clc-e2e-idp-vm-60258" \
        "hub-view-access|acm-vm-fleet:view|rbac-hub-placement|none" \
        "kubevirt-admin-access|kubevirt.io:admin|rbac-hub-placement|${TARGET_NAMESPACE}"
    track_result $?
    
    # 15-idp-vm-ldap-group: IDP-agnostic VM permissions test (LDAP group)
    # Used in: RHACM4K-60258, Group: qe-idp-vm-group
    apply_mcra_multi "ldap-idp-vm-group-assignment" "Group" "qe-idp-vm-group" \
        "hub-view-access|acm-vm-fleet:view|rbac-hub-placement|none" \
        "kubevirt-admin-access|kubevirt.io:admin|rbac-hub-placement|${TARGET_NAMESPACE}"
    track_result $?
    
    fi  # end VM tier MCRAs

    # ── CCLM tier MCRAs (only when VIRT_TIER is full or custom) ──
    if [[ "${VIRT_TIER:-custom}" == "full" || "${VIRT_TIER:-custom}" == "custom" ]]; then
    log_info "Creating CCLM tier MCRAs..."

    # 16-cclm-admin: CCLM full admin (consolidated)
    # Used in: RHACM4K-60989, User: clc-e2e-cclm-admin
    apply_mcra_multi "clc-e2e-cclm-admin-assignment" "User" "clc-e2e-cclm-admin-60989" \
        "hub-admin-access|acm-vm-fleet:admin|rbac-hub-placement|none" \
        "kubevirt-admin-access|kubevirt.io:admin|rbac-hub-spoke-placement|${CCLM_NAMESPACE},${TARGET_NAMESPACE}" \
        "managed-admin-access|acm-vm-extended:admin|rbac-hub-spoke-placement|${CCLM_NAMESPACE},${TARGET_NAMESPACE}" \
        "cluster-migration-view|acm-vm-cluster-migration:view|rbac-hub-spoke-placement|none"
    track_result $?
    
    
    fi  # end CCLM tier MCRAs

    # ── VM tier MCRAs continued (groups, search, mtv -- only when vm/full/custom) ──
    if [[ "${VIRT_TIER:-custom}" == "vm" || "${VIRT_TIER:-custom}" == "full" || "${VIRT_TIER:-custom}" == "custom" ]]; then

    # 18-operator-group: Spoke operator via group
    # Used in: RHACM4K-60239, Group: clc-e2e-group-60239
    # Roles: acm-vm-fleet:view (hub) + kubevirt.io:admin (spoke/ns) + acm-vm-extended:view (spoke/ns for metrics)
    apply_mcra_multi "clc-e2e-group-60239-assignment" "Group" "clc-e2e-group-60239" \
        "hub-view-access|acm-vm-fleet:view|rbac-hub-placement|none" \
        "spoke-admin-access|kubevirt.io:admin|rbac-spoke-placement|${TARGET_NAMESPACE}" \
        "spoke-managed-view|acm-vm-extended:view|rbac-spoke-placement|${TARGET_NAMESPACE}"
    track_result $?

    # 19-ldap-admin-group: LDAP admin group - Full Fleet Administrator
    # Used in: RHACM4K-60251, Group: qe-admin-group-60251
    apply_mcra_multi "qe-admin-group-60251-assignment" "Group" "qe-admin-group-60251" \
        "hub-admin-access|acm-vm-fleet:admin|rbac-hub-placement|none" \
        "global-vm-admin|kubevirt.io:admin|rbac-hub-spoke-placement|none" \
        "global-managed-admin|acm-vm-extended:admin|rbac-hub-spoke-placement|none"
    track_result $?
    
    # 20-ldap-view-group: LDAP view group - Read-Only Fleet Viewer
    # Used in: RHACM4K-60229, Group: qe-view-group-60229
    apply_mcra_multi "qe-view-group-60229-assignment" "Group" "qe-view-group-60229" \
        "hub-view-access|acm-vm-fleet:view|rbac-hub-placement|none" \
        "global-vm-view|kubevirt.io:view|rbac-hub-spoke-placement|none" \
        "global-managed-view|acm-vm-extended:view|rbac-hub-spoke-placement|none"
    track_result $?
    

    # 21-search-proxy: Search cluster-proxy RBAC test
    # Used in: RHACM4K-61846, User: clc-e2e-search-61846
    # Roles: acm-vm-fleet:view (hub) + kubevirt.io:admin (spoke) + acm-vm-extended:view (spoke, for Step 8 pod visibility)
    apply_mcra_multi "clc-e2e-search-proxy-assignment" "User" "clc-e2e-search-61846" \
        "fleet-view-access|acm-vm-fleet:view|rbac-hub-placement|none" \
        "spoke-kubevirt-admin|kubevirt.io:admin|rbac-spoke-placement|none" \
        "spoke-extended-view|acm-vm-extended:view|rbac-spoke-placement|none"
    track_result $?

    # 22-mtv-webhook: MTV provider webhook test
    # Used in: RHACM4K-59195, User: clc-e2e-view-cluster-59195
    # Roles: acm-vm-fleet:view (hub) + kubevirt.io:admin (spoke) + acm-vm-fleet:admin (hub, mtv-integrations)
    apply_mcra_multi "clc-e2e-mtv-webhook-assignment" "User" "clc-e2e-view-cluster-59195" \
        "fleet-view-access|acm-vm-fleet:view|rbac-hub-placement|none" \
        "spoke-kubevirt-admin|kubevirt.io:admin|rbac-spoke-placement|${TARGET_NAMESPACE},${CCLM_NAMESPACE}" \
        "fleet-admin-mtv|acm-vm-fleet:admin|rbac-hub-placement|mtv-integrations"
    track_result $?

    fi  # end VM tier MCRAs continued

    # ── RBAC-UI tier MCRAs (always created) ──
    log_info "Creating RBAC-UI tier MCRAs..."

    # 23-clusterset-entry: Cluster set entry point RA creation
    # Used in: RHACM4K-61863, User: clc-e2e-clusterset-61863
    # Roles: acm-vm-fleet:view (hub, to see Cluster Sets page)
    apply_mcra_single "clc-e2e-clusterset-61863-assignment" "User" "clc-e2e-clusterset-61863" \
        "hub-fleet-view" "acm-vm-fleet:view" "rbac-hub-placement" "none"
    track_result $?

    # 24-reviewdiff-61825: Review step diff display test
    # Used in: RHACM4K-61825, User: clc-e2e-reviewdiff-61825
    apply_mcra_single "clc-e2e-reviewdiff-61825-assignment" "User" "clc-e2e-reviewdiff-61825" \
        "reviewdiff-view-assignment" "kubevirt.io:view" "rbac-spoke-placement" "${TARGET_NAMESPACE}"
    track_result $?

    log_info "MCRA Application Summary: $success_count succeeded, $fail_count failed out of $total_count total (tier: ${VIRT_TIER:-custom})."
    
    if [[ $fail_count -gt 0 ]]; then
        return 1
    fi
    return 0
}

# ============================================================
# Main Execution
# ============================================================

main() {
    echo "============================================================"
    echo "Fine-Grained RBAC Setup for Virtualization Test Cases"
    echo "============================================================"
    echo ""
    echo "RBAC Configuration:"
    echo "  HUB_CLUSTER:           ${HUB_CLUSTER}"
    echo "  SPOKE_CLUSTERS:        ${SPOKE_CLUSTERS}"
    echo "  SPOKE_CLUSTER:         ${SPOKE_CLUSTER}"
    echo "  MCRA_NAMESPACE:        ${MCRA_NAMESPACE}"
    echo "  MCRA_NAMESPACE_GLOBAL: ${MCRA_NAMESPACE_GLOBAL}"
    echo "  TARGET_NAMESPACE:      ${TARGET_NAMESPACE}"
    echo "  CCLM_NAMESPACE:        ${CCLM_NAMESPACE}"
    echo ""
    echo "============================================================"
    
    # Validate environment configuration
    validate_environment
    
    
    # Verify Fine-Grained RBAC is available (ACM 2.16+)
    if ! verify_fg_rbac; then
        log_warn "MCRA setup skipped. See messages above for details."
        echo "============================================================"
        echo "Fine-Grained RBAC Setup: SKIPPED"
        echo "============================================================"
        exit 0
    fi
    
    # Create OCP groups
    create_ocp_groups
    
    echo ""
    echo "============================================================"
    echo "Applying Placements and MCRAs (ACM 2.16 format)"
    echo "============================================================"
    
    # Apply Placements first, then MCRAs, then validate
    apply_all_placements
    ensure_spoke_namespaces
    apply_all_mcras
    validate_all_mcras
    
    echo ""
    echo "============================================================"
    echo "Fine-Grained RBAC Setup: COMPLETE"
    echo "============================================================"
}

# Run main
main "$@"
