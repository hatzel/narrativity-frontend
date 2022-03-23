"""
Transform dprose.jsonlines as created by the event-classification project into a directory strucutre sutiable for serving.
"""
import argparse
import json
from os import path
from csv import DictReader

parser = argparse.ArgumentParser(
    description="Transform dprose.jsonlines into directory"
)
parser.add_argument(
    "JSONLINES", help="Input jsonlines file with pre-computed events and dprose ids."
)
parser.add_argument(
    "METADATA", help="CSV file with the columns: ID,Repositorium,Vorname Autor,Nachname Autor,Gesamtname Autor,Titel,Dateiname,verwendetes Datum"
)
parser.add_argument("OUT_DIR", help="Ouptut directory")


def rename_fields(in_data):
    output = {}
    fields = [("ID", "id"), ("Repositorium", "source"), ("Gesamtname Autor", "author"), ("Titel", "title"), ("verwendetes Datum", "releaseYear")]
    for old_name, new_name in fields:
        if new_name == "releaseYear":
            output[new_name] = in_data.get(old_name)
        else:
            output[new_name] = in_data[old_name]
    return output


def main(args):
    in_file = open(args.JSONLINES, "r")
    metadata_file = open(args.METADATA)
    out_metadata_file_name = path.join(args.OUT_DIR, "index.json")
    metadata_out_file = open(out_metadata_file_name, "w")
    out_metadata = []
    out_metadata_ids = set()
    for book in DictReader(metadata_file):
        book_info = rename_fields(book)
        book_info["id"] = "dprose_" + str(book_info["id"])
        out_metadata_ids.add(book_info["id"])
        out_metadata.append(book_info)

    is_predicted = set()
    for line in in_file:
        data = json.loads(line)
        name = f"dprose_{data['dprose_id']}.json"
        out_path = path.join(args.OUT_DIR, name)
        out_file = open(out_path, "w")
        # We want to be able to add non-dprose texts in the future so we prefix the id
        data["id"] = "dprose_" + str(data["dprose_id"])
        assert data["id"] in out_metadata_ids
        is_predicted.add(data["id"])
        del data["dprose_id"]
        json.dump(data, out_file)
        out_file.close()

    # If for some reason any were not predicted throw them out of the index as well
    out_metadata_filtered = [md for md in out_metadata if md["id"] in is_predicted]
    json.dump(out_metadata_filtered, metadata_out_file)
    metadata_out_file.close()


if __name__ == "__main__":
    args = parser.parse_args()
    main(args)