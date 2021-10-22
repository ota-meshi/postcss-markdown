"use strict";

const path = require("path");
const chai = require("chai");
const { jestSnapshotPlugin } = require("mocha-chai-jest-snapshot");
const autoprefixer = require("autoprefixer");
const postcss = require("postcss");
const { listupFixtures } = require("../utils");
const syntax = require("../..");

chai.use(jestSnapshotPlugin());

const FIXTURE_ROOT = path.resolve(
	__dirname,
	"../../test-fixtures/integration/autoprefixer"
);

describe("Integration with autoprefixer", () => {
	for (const { filename, content } of listupFixtures(FIXTURE_ROOT)) {
		describe(`autoprefixer with markdown`, () => {
			it(filename, () =>
				postcss([autoprefixer])
					.process(content, { syntax })
					.then(function (result) {
						const actual = result.content;
						chai.expect(actual).toMatchSnapshot();
					})
			);
		});
	}
});
