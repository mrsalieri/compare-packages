const express = require("express");
const RepoController = require("../controllers/repo");

const router = express.Router();

/**
 * @swagger
 * /api/repo/addemail:
 *   post:
 *     tags:
 *       - Repo
 *     description: Add emails for the given repo
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: nameIn
 *         description: name of the repository
 *         in: formData
 *         required: true
 *         type: string
 *       - name: namespaceIn
 *         description: namespace of the repository
 *         in: formData
 *         required: true
 *         type: string
 *       - name: emailListIn
 *         description: List of emails to be added
 *         in: formData
 *         required: true
 *         type: array
 *         items:
 *           type: string
 *     responses:
 *       200:
 *         description: success, returns data
 *       400:
 *         description: invalid input
 *       404:
 *         description: repo not found on remote
 */

router.post("/addemail", async (req, res) => {
  await RepoController.addEmailToRepo(req, res);
});

/**
 * @swagger
 * /api/repo/getdetails?namespace={namespace}&name={name}:
 *   get:
 *     tags:
 *       - Repo
 *     description: Get info about the repo given
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: nameIn
 *         description: name of the repository
 *         in: path
 *         required: true
 *         type: string
 *       - name: namespaceIn
 *         description: namespace of the repository
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: success, returns data
 *       400:
 *         description: invalid input
 *       404:
 *         description: repo not found
 */

router.get("/getdetails", async (req, res) => {
  await RepoController.getRepoDetails(req, res);
});

module.exports = router;
