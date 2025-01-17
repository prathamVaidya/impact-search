import { INode } from "react-accessible-treeview";
import { CategoryNode, MediaWikiResponse, SPARQLResponse } from "../types";
import { IFlatMetadata } from "react-accessible-treeview/dist/TreeView/utils";

function buildWikidataQuery(
  occupationIDs: string[],
  genderID: string,
  ethnicityID: string
): string {
  const properties = {
    instanceOf: "P31",
    sexOrGender: "P21",
    ethnicGroup: "P172",
    occupation: "P106",
  };
  const qValues = { human: "Q5" };
  let query = `SELECT DISTINCT ?article ?personLabel WHERE {
    ?person wdt:${properties.instanceOf} wd:${qValues.human} .`;

  if (genderID) {
    query += `\n    ?person wdt:${properties.sexOrGender} wd:${genderID} .`;
  }

  if (ethnicityID) {
    query += `\n    ?person wdt:${properties.ethnicGroup} wd:${ethnicityID} .`;
  }

  if (occupationIDs.length > 0) {
    query += `\n    ?person wdt:${
      properties.occupation
    } ?occ .\n    VALUES ?occ { ${occupationIDs
      .map((occ) => `wd:${occ}`)
      .join(" ")} }`;
  }

  query += `
    ?article schema:about ?person .
    ?article schema:isPartOf <https://en.wikipedia.org/>.
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}`;

  return encodeURIComponent(query);
}

function convertArticlesToCSV(
  articles: SPARQLResponse["results"]["bindings"]
): string {
  let csvContent = "data:text/csv;charset=utf-8,Articles\n";

  articles.forEach((item) => {
    csvContent += `${item.personLabel.value}\n`;
  });

  return csvContent;
}

function downloadAsCSV(csvContent: string, fileName = "articles.csv"): void {
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", fileName);
  link.click();
}

const convertResponseToTree = (
  response: MediaWikiResponse,
  existingIDs: INode<IFlatMetadata>[],
  elementId: number
): CategoryNode => {
  const pages = response.query.pages;

  const rootNode: CategoryNode = {
    name: "root",
    isBranch: true,
    id: elementId,
    pages: [],
    children: [],
  };

  for (const [, value] of Object.entries(pages)) {
    if (value.categoryinfo) {
      let isDuplicateNode = false;
      existingIDs.forEach((e) => {
        if (e.id === value.pageid) {
          isDuplicateNode = true;
        }
      });

      if (isDuplicateNode) {
        continue;
      }
      const categoryName: string = `${
        value.title.slice(9) /* slice out "category:" prefix */
      } (${value.categoryinfo.subcats} C, ${value.categoryinfo.pages} P)`;

      rootNode.children?.push({
        name: categoryName,
        id: value.pageid,
        isBranch: true,
        pages: [],
        children: [],
      });
    } else {
      rootNode.pages.push({ id: value.pageid, title: value.title });
    }
  }

  return rootNode;
};
export {
  buildWikidataQuery,
  convertArticlesToCSV,
  downloadAsCSV,
  convertResponseToTree,
};
