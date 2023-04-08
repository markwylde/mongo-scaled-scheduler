#!/bin/bash

mongosh <<EOF
if (rs.initiate().ok) {
  db2 = connect('mongodb://localhost:27017/?replicaSet=dbrs');

  admin = db2.getSiblingDB("admin")

  admin.createUser(
    {
      user: "testadmin1",
      pwd: "testpass1",
      roles: [
        { role: "userAdminAnyDatabase", db: "admin" }
      ]
    }
  )
}
EOF

test `mongosh --quiet --eval "rs.status().ok"` -eq 1
