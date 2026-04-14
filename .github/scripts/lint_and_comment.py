import os
import sys
import subprocess

from github import Auth, Github

# Strip from child processes so npm/linter hooks cannot read runner tokens.
_SUBPROCESS_ENV_BLOCKLIST = frozenset(
    {
        "GITHUB_TOKEN",
        "GH_TOKEN",
        "ACTIONS_RUNTIME_TOKEN",
        "ACTIONS_ID_TOKEN_REQUEST_TOKEN",
        "ACTIONS_ID_TOKEN_REQUEST_URL",
        "NODE_AUTH_TOKEN",
        "NPM_TOKEN",
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
        "AWS_SESSION_TOKEN",
    }
)


def _subprocess_env() -> dict[str, str]:
    return {k: v for k, v in os.environ.items() if k not in _SUBPROCESS_ENV_BLOCKLIST}


def main():
    try:
        auth = Auth.Token(os.environ["GITHUB_TOKEN"])
        gh = Github(auth=auth)
        repo = gh.get_repo(os.environ["GITHUB_REPOSITORY"])
        pr_number = int(os.environ["PR_NUMBER"])
        pr = repo.get_pull(pr_number)
        repo_root = os.environ["REPO_ROOT"]
        commit_sha = os.environ["COMMIT_SHA"]
    except KeyError as e:
        print(f"ERROR: Missing environment variable {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Failed to connect to GitHub or get PR: {e}", file=sys.stderr)
        sys.exit(1)

    try:
        process = subprocess.run(
            ["npm", "run", "lint:check"],
            shell=False,
            capture_output=True,
            text=True,
            check=False,
            cwd=repo_root,
            env=_subprocess_env(),
        )
        lint_output = process.stdout + process.stderr
    except Exception as e:
        print(f"ERROR: Failed to run lint check: {e}", file=sys.stderr)
        sys.exit(1)

    if process.returncode != 0:
        commit_url = f"{pr.html_url}/commits/{commit_sha}"
        lint_output_for_comment = (
            lint_output[:60000] if lint_output else "(no lint output captured)"
        )
        comment_body = f"""Lint Check Failed for commit [`{commit_sha[:7]}`]({commit_url}).

Please fix the linting errors by running `npm run lint:fix` in the `console-e2e` repository root before merging.

<details>
<summary>Details</summary>

```
{lint_output_for_comment}
```
</details>
"""
        try:
            pr.create_issue_comment(comment_body)
            print("Posted lint failure comment to PR.")
            sys.exit(1)
        except Exception as e:
            print(f"ERROR: Failed to post comment on PR: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        print("Lint check passed. No comment needed.")


if __name__ == "__main__":
    main()
