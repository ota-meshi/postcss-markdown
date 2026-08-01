import { fileURLToPath } from "url";
import autoprefixer from "autoprefixer";
import * as chai from "chai";
import { jestSnapshotPlugin } from "mocha-chai-jest-snapshot";
import postcss from "postcss";
import syntax from "../../lib/index.js";
import { listupFixtures } from "../utils.js";

chai.use(jestSnapshotPlugin());

const FIXTURE_ROOT = fileURLToPath(
	new URL("../../test-fixtures/integration/autoprefixer", import.meta.url),
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
					}),
			);
		});
	}
});
