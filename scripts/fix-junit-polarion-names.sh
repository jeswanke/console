#!/usr/bin/env bash
# Rewrite Playwright JUnit XML testcase names for Polarion import.
#
# Playwright:  name="Suite › RHACM4K-XXXXX: ALC: Test"  classname="path/file.spec.ts"
# Polarion:    name="RHACM4K-XXXXX: ALC: Test"          classname="Suite RHACM4K-XXXXX: ALC: Test"
#
# Usage: ./scripts/fix-junit-polarion-names.sh [test-results/]
set -euo pipefail

DIR="${1:-test-results}"

for xml in "${DIR}"/*.xml; do
  [ -f "$xml" ] || continue

  perl -i -pe '
    if (/testcase.*RHACM4K-/) {
      if (/name="(.+?) › (RHACM4K-[^"]+)"/) {
        my $suite = $1;
        my $polarion = $2;
        s/name="[^"]+"/name="$polarion"/;
        s/classname="[^"]+"/classname="$suite $polarion"/;
      }
    }
  ' "$xml"

  echo "processed ${xml}"
done
