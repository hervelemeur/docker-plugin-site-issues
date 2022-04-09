import findPackageJson from 'find-package-json';
import { Request, Response } from 'express';
import { DB, Issue } from './db.js';

declare module 'express-serve-static-core' {
  interface Request {
    db: DB
  }
}

/* GET home page. */
export function indexRoute(_req: Request, res: Response) {
  res.type('text').send('OK');
}

export function healthcheckRoute(_req: Request, res: Response) {
  res.type('text').send('OK');
}

export function infoRoute(_req: Request, res: Response) {
  const { version } = findPackageJson().next().value || {};
  res.json({
    commit: version,
    version: version,
  });
}

function compareIssuesDates(a: Issue, b: Issue) {
  return (Date.parse(b.created) - Date.parse(a.created))
  || (Date.parse(b.updated) - Date.parse(a.updated));
}

/* GET issues listing. */
export async function issuesRoute(req: Request, res: Response): Promise<void> {
  const pluginTrackers = await req.db.getIssuesForPlugin(req.params.plugin);
  if (!pluginTrackers) {
    res.status(404).send('No such plugin');
    return;
  }
  const promises = [];
  for (const tracker of pluginTrackers) {
    if (tracker.type === 'jira') {
      promises.push(req.db.getJiraIssues(parseInt(tracker.reference, 10)));
    } else if (tracker.type === 'github') {
      promises.push(req.db.getGithubIssues(tracker.reference));
    }
  }
  const sortedIssues = await Promise.all(promises)
    .then((issues) => issues.flat())
    .then((issues) => issues.sort(compareIssuesDates));
  res.json({ issues: sortedIssues });
}
