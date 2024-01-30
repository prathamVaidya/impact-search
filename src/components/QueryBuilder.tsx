import { FormEvent, useState } from "react";
import "./QueryBuilder.scss";
import QueryItem from "./QueryItem";
import { buildWikidataQuery } from "../common/utils";
import ArticlesTable from "./ArticlesTable";
import LoadingOval from "./LoadingOval";

export default function QueryBuilder() {
  const [queryItemsData, setQueryItemsData] = useState<QueryProperty[]>([
    { property: "", qValue: "" },
  ]);
  const [articles, setArticles] = useState<
    {
      article: {
        type: string;
        value: string;
      };
    }[]
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleAddQueryItem = () => {
    if (queryItemsData.length < 5) {
      setQueryItemsData([...queryItemsData, { property: "", qValue: "" }]);
    }
  };

  const handleRemoveQueryItem = (index: number) => {
    if (queryItemsData.length > 1) {
      const updatedProperties = queryItemsData.filter(
        (_, idx) => idx !== index
      );
      setQueryItemsData(updatedProperties);
    }
  };

  const handleChange = (
    index: number,
    field: "property" | "qValue",
    value: string
  ) => {
    const updatedProperties = [...queryItemsData];
    updatedProperties[index][field] = value;
    setQueryItemsData(updatedProperties);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fetchedArticles = await fetchArticlesByQuery();
    setArticles(fetchedArticles.results.bindings);
  };

  async function fetchArticlesByQuery(): Promise<SPARQLResponse> {
    setIsLoading(true);

    const gender = queryItemsData.filter((item) => item.property === "gender");
    const ethnicity = queryItemsData.filter(
      (item) => item.property === "ethnicity"
    );
    const occupations = queryItemsData.filter(
      (item) => item.property === "occupation"
    );

    const query: string = buildWikidataQuery(
      occupations.map((occupation) => occupation.qValue),
      gender.length > 0 ? gender[0].qValue : "",
      ethnicity.length > 0 ? ethnicity[0].qValue : ""
    );
    const response = await fetch(
      `https://query.wikidata.org/sparql?query=${query}&format=json`,
      {
        headers: {
          Accept: "application/sparql-results+json",
        },
      }
    );
    const queriedArticlesJSON: SPARQLResponse = await response.json();

    setIsLoading(false);

    return queriedArticlesJSON;
  }
  return (
    <div className="query-builder">
      <label>Select Properties</label>
      <form onSubmit={(e) => handleSubmit(e)}>
        {queryItemsData.map((property, index) => (
          <QueryItem
            handleChange={(index, value) =>
              handleChange(index, "property", value)
            }
            handleTextFieldChange={(index, value) =>
              handleChange(index, "qValue", value)
            }
            handleRemoveQueryItem={handleRemoveQueryItem}
            index={index}
            key={index}
            properties={queryItemsData}
            property={property.property}
            qValue={property.qValue}
          />
        ))}
        {queryItemsData.length < 5 && (
          <button
            type="button"
            className="add-button"
            onClick={handleAddQueryItem}
          >
            Add
          </button>
        )}
        <div>
          <button type="submit" className="submit-button">
            Run Query
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="oval-container">
          <LoadingOval visible={isLoading} />
        </div>
      ) : articles.length > 0 ? (
        <ArticlesTable articles={articles} />
      ) : (
        ""
      )}
    </div>
  );
}

type QueryProperty = {
  property: string;
  qValue: string;
};

type SPARQLResponse = {
  head: {
    vars: string[];
  };
  results: {
    bindings: Array<{
      article: {
        type: string;
        value: string;
      };
    }>;
  };
};
