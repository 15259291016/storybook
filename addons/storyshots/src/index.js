import fs from 'fs';
import glob from 'glob';
import global, { describe, it } from 'global';
import addons, { mockChannel } from '@storybook/addons';
import loadFramework from './frameworkLoader';
import getIntegrityOptions from './getIntegrityOptions';
import { getPossibleStoriesFiles, getSnapshotFileName } from './utils';
import { imageSnapshot } from './test-body-image-snapshot';

import {
  multiSnapshotWithOptions,
  snapshotWithOptions,
  snapshot,
  shallowSnapshot,
  renderOnly,
} from './test-bodies';

global.STORYBOOK_REACT_CLASSES = global.STORYBOOK_REACT_CLASSES || {};

export {
  getSnapshotFileName,
  snapshot,
  multiSnapshotWithOptions,
  snapshotWithOptions,
  shallowSnapshot,
  renderOnly,
  imageSnapshot,
};

const methods = ['beforeAll', 'beforeEach', 'afterEach', 'afterAll'];

export default function testStorySnapshots(options = {}) {
  if (typeof describe !== 'function') {
    throw new Error('testStorySnapshots is intended only to be used inside jest');
  }

  addons.setChannel(mockChannel());

  const { storybook, framework, renderTree, renderShallowTree } = loadFramework(options);
  const stories = storybook.getStorybook();

  if (stories.length === 0) {
    throw new Error('storyshots found 0 stories');
  }

  const suite = options.suite || 'Storyshots';

  const snapshotOptions = {
    renderer: options.renderer,
    serializer: options.serializer,
  };

  const testMethod = options.test || snapshotWithOptions(snapshotOptions);
  const integrityOptions = getIntegrityOptions(options);

  methods.forEach(method => {
    if (typeof testMethod[method] === 'function') {
      global[method](testMethod[method]);
    }
  });

  // eslint-disable-next-line
  for (const group of stories) {
    const { fileName, kind } = group;

    if (options.storyKindRegex && !kind.match(options.storyKindRegex)) {
      // eslint-disable-next-line
      continue;
    }

    describe(suite, () => {
      describe(kind, () => {
        // eslint-disable-next-line
        for (const story of group.stories) {
          if (options.storyNameRegex && !story.name.match(options.storyNameRegex)) {
            // eslint-disable-next-line
            continue;
          }

          it(story.name, () => {
            const context = { fileName, kind, story: story.name, framework };
            return testMethod({
              story,
              context,
              renderTree,
              renderShallowTree,
            });
          });
        }
      });
    });
  }

  if (integrityOptions !== false) {
    describe('Storyshots Integrity', () => {
      test('Abandoned Storyshots', () => {
        const storyshots = glob.sync('**/*.storyshot', integrityOptions);

        console.log(storyshots);

        const abandonedStoryshots = storyshots.filter(fileName => {
          const possibleStoriesFiles = getPossibleStoriesFiles(fileName);
          return !possibleStoriesFiles.some(fs.existsSync);
        });
        expect(abandonedStoryshots).toHaveLength(0);
      });
    });
  }
}
