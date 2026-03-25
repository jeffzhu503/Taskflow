VALIDATE_REPO = """
query ValidateRepo($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    name
    description
    stargazerCount
    isPrivate
    openIssues: issues(states: [OPEN]) { totalCount }
  }
}
"""

LIST_ISSUES = """
query ListIssues($owner: String!, $name: String!, $states: [IssueState!]) {
  repository(owner: $owner, name: $name) {
    issues(states: $states, first: 50, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes {
        number
        title
        state
        createdAt
        author { login }
        labels(first: 10) { nodes { name color description } }
        comments { totalCount }
      }
    }
  }
}
"""

GET_ISSUE = """
query GetIssue($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    issue(number: $number) {
      number
      title
      body
      state
      createdAt
      author { login }
      labels(first: 20) { nodes { name color description } }
      comments(first: 50) {
        nodes {
          id
          body
          createdAt
          author { login }
        }
      }
    }
  }
}
"""

LIST_PULLS = """
query ListPulls($owner: String!, $name: String!, $states: [PullRequestState!]) {
  repository(owner: $owner, name: $name) {
    pullRequests(states: $states, first: 50, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes {
        number
        title
        state
        createdAt
        author { login }
        headRefName
        baseRefName
        mergeable
        comments { totalCount }
      }
    }
  }
}
"""

GET_PULL = """
query GetPull($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      number
      title
      body
      state
      createdAt
      author { login }
      headRefName
      baseRefName
      mergeable
      comments(first: 50) {
        nodes {
          id
          body
          createdAt
          author { login }
        }
      }
    }
  }
}
"""

LIST_LABELS = """
query ListLabels($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    labels(first: 100) {
      nodes {
        name
        color
        description
      }
    }
  }
}
"""
